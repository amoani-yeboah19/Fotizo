import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, policyAcceptancesTable, servicesTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { CURRENT_POLICY_VERSIONS, parseProfile, readProfile, toOwnProfile, writeProfile } from "../lib/profile";
import { listingImagesProblem } from "../lib/storage";
import { toPublicUser } from "./auth";

const router: IRouter = Router();

// The owner's full profile, onboarding state and policy acceptance history.
router.get("/account/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  const userId = req.auth!.userId;
  const [user] = await db
    .select({ onboardingCompletedAt: usersTable.onboardingCompletedAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Please sign in again." });
    return;
  }
  const accepted = await db
    .select({
      policy: policyAcceptancesTable.policy,
      version: policyAcceptancesTable.policyVersion,
      acceptedAt: policyAcceptancesTable.acceptedAt,
    })
    .from(policyAcceptancesTable)
    .where(eq(policyAcceptancesTable.userId, userId))
    .orderBy(desc(policyAcceptancesTable.acceptedAt));
  res.json({
    profile: toOwnProfile(await readProfile(userId)),
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    policies: {
      current: CURRENT_POLICY_VERSIONS,
      accepted: accepted.map((a) => ({ ...a, acceptedAt: a.acceptedAt.toISOString() })),
    },
  });
});

const saveSchema = z.object({ expectedVersion: z.number().int().min(0), profile: z.unknown() }).strict();

// Creates or replaces the owner's profile. `expectedVersion` is the version
// last read (0 for none); a stale version is rejected so edits from another
// tab or device are never silently overwritten.
router.put("/account/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = saveSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Send the profile and the version you last loaded." });
    return;
  }
  const [user] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.auth!.userId));
  if (!user) {
    res.status(401).json({ error: "Please sign in again." });
    return;
  }
  // Validated against the role stored now, not one the client claims.
  const parsed = parseProfile(body.data.profile, user.role);
  if (!parsed.profile) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const profile = parsed.profile;
  const saved = await db.transaction((tx) => writeProfile(tx, user, profile, body.data.expectedVersion));
  if (!saved) {
    res.status(409).json({
      error: "Your profile was changed elsewhere. Reload to see the latest version, then make your changes again.",
    });
    return;
  }
  res.json({ profile: toOwnProfile(saved) });
});

const avatarSchema = z.object({ avatar: z.string().max(2000).nullable() }).strict();

// Sets or removes the account's profile photo. A new photo must be one this
// account uploaded (POST /uploads/images?purpose=avatar).
router.put("/account/avatar", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = avatarSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Upload a photo, or remove the current one." });
    return;
  }
  const [current] = await db.select().from(usersTable).where(eq(usersTable.id, req.auth!.userId));
  if (!current) {
    res.status(401).json({ error: "Please sign in again." });
    return;
  }
  if (body.data.avatar) {
    const problem = await listingImagesProblem(
      current.id,
      "avatar",
      [body.data.avatar],
      current.avatar ? [current.avatar] : [],
    );
    if (problem) {
      res.status(400).json({ error: problem === "Use photos you uploaded to this listing." ? "Use a photo you uploaded." : problem });
      return;
    }
  }
  const [user] = await db
    .update(usersTable)
    .set({ avatar: body.data.avatar })
    .where(eq(usersTable.id, current.id))
    .returning();
  res.json(toPublicUser(user));
});

// Public professional profile: only the fields a professional publishes, plus
// their live services, for active professional accounts. Location, language,
// business and purpose stay private. Providers who haven't written a profile
// yet still get a page listing their services.
router.get("/profiles/:userId", async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.userId);
  if (!id.success) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      avatar: usersTable.avatar,
      verified: usersTable.verified,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(and(eq(usersTable.id, id.data), eq(usersTable.role, "seller"), isNull(usersTable.suspendedAt)));
  const [profile, services] = user
    ? await Promise.all([
        readProfile(user.id),
        db
          .select({
            id: servicesTable.id,
            title: servicesTable.title,
            category: servicesTable.category,
            hourlyRate: servicesTable.hourlyRate,
            rating: servicesTable.rating,
            reviewCount: servicesTable.reviewCount,
            avatar: servicesTable.avatar,
          })
          .from(servicesTable)
          .where(and(eq(servicesTable.providerId, user.id), eq(servicesTable.status, "active")))
          .orderBy(desc(servicesTable.createdAt))
          .limit(24),
      ])
    : [undefined, []];
  if (!user || (!profile?.headline && !services.length)) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    avatar: user.avatar ?? undefined,
    verified: user.verified,
    joinedAt: user.createdAt.toISOString().split("T")[0],
    headline: profile?.headline ?? "",
    about: profile?.about ?? "",
    skills: profile?.skills ?? [],
    experience: profile?.experience ?? "",
    workMode: profile?.workMode ?? "",
    website: profile?.website ?? "",
    services,
  });
});

export default router;

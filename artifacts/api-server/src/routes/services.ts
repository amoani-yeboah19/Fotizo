import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, servicesTable, usersTable, type ServiceRow } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const packageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().positive(),
  delivery: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000),
});

const newServiceSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(20).max(5000),
  experience: z.string().trim().min(1).max(80),
  hourlyRate: z.number().positive(),
  availability: z.string().trim().min(1).max(80),
  skills: z.array(z.string().trim().min(1)).min(1).max(20),
  avatar: z.string().trim().min(1),
  packages: z.array(packageSchema).min(1).max(3),
});

// Shape returned to the client — provider name is looked up via the FK at
// read time rather than stored on the row, so a renamed provider never goes
// stale (same reasoning as toPublicProduct in products.ts).
function toPublicService(row: ServiceRow, providerName: string) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    provider: providerName,
    providerId: row.providerId,
    avatar: row.avatar,
    rating: row.rating,
    reviewCount: row.reviewCount,
    experience: row.experience,
    hourlyRate: row.hourlyRate,
    category: row.category,
    availability: row.availability,
    packages: row.packages,
    skills: row.skills,
  };
}

router.get("/services", async (_req, res) => {
  const rows = await db
    .select({ service: servicesTable, providerName: usersTable.name })
    .from(servicesTable)
    .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
    .where(eq(servicesTable.status, "active"))
    .orderBy(desc(servicesTable.createdAt));
  res.json(rows.map((r) => toPublicService(r.service, r.providerName ?? "Unknown provider")));
});

router.get("/services/:id", async (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  const [row] = await db
    .select({ service: servicesTable, providerName: usersTable.name })
    .from(servicesTable)
    .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
    .where(and(eq(servicesTable.id, parsedId.data), eq(servicesTable.status, "active")))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  res.json(toPublicService(row.service, row.providerName ?? "Unknown provider"));
});

// Role is enforced server-side, same as products' listing restriction — a
// client can't just claim to be a seller by editing the request body.
router.post("/services", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.auth!.role !== "seller") {
    res.status(403).json({ error: "Only seller accounts can offer services." });
    return;
  }

  const parsed = newServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid service data.", issues: parsed.error.issues });
    return;
  }

  const [created] = await db
    .insert(servicesTable)
    .values({ ...parsed.data, providerId: req.auth!.userId })
    .returning();

  const provider = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.auth!.userId) });
  res.status(201).json(toPublicService(created, provider?.name ?? "Unknown provider"));
});

export default router;

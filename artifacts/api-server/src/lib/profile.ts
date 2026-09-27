import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import {
  db,
  accountProfilesTable,
  policyAcceptancesTable,
  usersTable,
  POLICIES,
  type AccountProfileRow,
  type UserRow,
} from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Versions of the published Terms of Service and Privacy Policy. Keep these in
// step with LAST_UPDATED on the frontend's /terms and /privacy pages.
export const CURRENT_POLICY_VERSIONS: Record<(typeof POLICIES)[number], string> = {
  terms: "2026-08-15",
  privacy: "2026-08-15",
};

// Stable codes for the choice fields; the frontend maps them to labels.
export const PURPOSES = ["shopping", "hiring", "business_buying", "shopping_and_hiring"] as const;
export const EXPERIENCE = ["under_1", "1_3", "3_5", "5_10", "over_10"] as const;
export const WORK_MODES = ["on_site", "remote", "on_site_and_remote", "product_sales"] as const;

const text = (max: number) => z.string().trim().max(max);
const optional = <T extends [string, ...string[]]>(values: T) => z.union([z.enum(values), z.literal("")]);

/** Profile contract v1: what the account owner can read and edit. */
export const profileInputSchema = z
  .object({
    country: z.string().trim().min(2).max(80),
    city: text(100).default(""),
    language: z.string().trim().min(2).max(80),
    accountType: z.enum(["individual", "business"]),
    company: text(120).default(""),
    purpose: optional([...PURPOSES]).default(""),
    headline: text(80).default(""),
    about: text(1200).default(""),
    skills: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
    experience: optional([...EXPERIENCE]).default(""),
    workMode: optional([...WORK_MODES]).default(""),
    website: text(300)
      .refine((value) => {
        if (!value) return true;
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      }, "Enter a full HTTPS portfolio URL, or leave it blank.")
      .default(""),
  })
  .strict();
export type ProfileInput = z.infer<typeof profileInputSchema>;

/** Role-specific requirements; returns a message for the first problem found. */
export function profileProblem(profile: ProfileInput, role: UserRow["role"]): string | null {
  if (profile.accountType === "business" && !profile.company) return "Enter your business or organisation name.";
  if (role === "buyer" && !profile.purpose) return "Select what you plan to use Fotizo for.";
  if (role === "seller") {
    if (profile.headline.length < 10) return "Add a professional headline of at least 10 characters.";
    if (profile.about.length < 80)
      return "Introduce your expertise and the work you deliver in at least 80 characters.";
    if (profile.skills.length < 1) return "Add between 1 and 10 skills.";
    if (new Set(profile.skills.map((s) => s.toLowerCase())).size !== profile.skills.length)
      return "Each skill should be listed once.";
    if (!profile.experience || !profile.workMode) return "Select your experience and how you deliver your work.";
  }
  return null;
}

/** Parses and validates a profile for the given role; returns data or a message. */
export function parseProfile(
  body: unknown,
  role: UserRow["role"],
): { profile: ProfileInput; error?: undefined } | { profile?: undefined; error: string } {
  const parsed = profileInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join(".");
    return { error: issue.message.startsWith("Enter") ? issue.message : `Check the ${field || "profile"} field.` };
  }
  const problem = profileProblem(parsed.data, role);
  return problem ? { error: problem } : { profile: parsed.data };
}

// Buyers keep no professional fields; professional details are dropped from
// other roles so nothing stale becomes public if a role changes later.
function forRole(profile: ProfileInput, role: UserRow["role"]): ProfileInput {
  const company = profile.accountType === "business" ? profile.company : "";
  const purpose = role === "buyer" ? profile.purpose : "";
  if (role === "seller") return { ...profile, company, purpose };
  return { ...profile, company, purpose, headline: "", about: "", skills: [], experience: "", workMode: "", website: "" };
}

export const toOwnProfile = (row: AccountProfileRow | undefined) =>
  row
    ? {
        version: row.version,
        country: row.country,
        city: row.city,
        language: row.language,
        accountType: row.accountType,
        company: row.company,
        purpose: row.purpose,
        headline: row.headline,
        about: row.about,
        skills: row.skills,
        experience: row.experience,
        workMode: row.workMode,
        website: row.website,
        updatedAt: row.updatedAt.toISOString(),
      }
    : null;

/**
 * Creates or updates the account's profile when `expectedVersion` matches the
 * stored one (0 when none exists). Completes onboarding on the first save.
 * Returns undefined on a version conflict.
 */
export async function writeProfile(
  tx: Tx,
  user: Pick<UserRow, "id" | "role">,
  input: ProfileInput,
  expectedVersion: number,
) {
  const values = forRole(input, user.role);
  const now = new Date();
  let row: AccountProfileRow | undefined;
  if (expectedVersion === 0) {
    [row] = await tx
      .insert(accountProfilesTable)
      .values({ userId: user.id, ...values })
      .onConflictDoNothing()
      .returning();
  } else {
    [row] = await tx
      .update(accountProfilesTable)
      .set({ ...values, version: sql`${accountProfilesTable.version} + 1`, updatedAt: now })
      .where(
        sql`${accountProfilesTable.userId} = ${user.id} AND ${accountProfilesTable.version} = ${expectedVersion}`,
      )
      .returning();
  }
  if (!row) return undefined;
  await tx
    .update(usersTable)
    .set({ onboardingCompletedAt: now })
    .where(sql`${usersTable.id} = ${user.id} AND ${usersTable.onboardingCompletedAt} IS NULL`);
  return row;
}

/** Records acceptance of the current policy versions for a new account. */
export async function recordPolicyAcceptance(tx: Tx, userId: string) {
  await tx
    .insert(policyAcceptancesTable)
    .values(POLICIES.map((policy) => ({ userId, policy, policyVersion: CURRENT_POLICY_VERSIONS[policy] })))
    .onConflictDoNothing();
}

export async function readProfile(userId: string) {
  const [row] = await db.select().from(accountProfilesTable).where(eq(accountProfilesTable.userId, userId));
  return row;
}

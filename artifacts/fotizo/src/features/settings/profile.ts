import { z } from "zod";
import type { AccountProfileInput } from "@/types";

export const profileSchema = z.object({
  country: z.string().trim().min(2, "Enter your country of residence.").max(80),
  city: z.string().trim().max(100),
  language: z.string().trim().min(2, "Enter your preferred language.").max(80),
  accountType: z.enum(["individual", "business"]),
  company: z.string().trim().max(120),
  purpose: z.string().trim().max(80),
  headline: z.string().trim().max(80),
  about: z.string().trim().max(1200),
  skills: z.string().trim().max(300),
  experience: z.string().max(40),
  workMode: z.string().max(40),
  website: z
    .string()
    .trim()
    .max(300)
    .refine((value) => {
      if (!value) return true;
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "Enter a full HTTPS portfolio URL, or leave it blank."),
});
export type ProfileDraft = z.infer<typeof profileSchema>;
export const emptyProfile: ProfileDraft = {
  country: "",
  city: "",
  language: "",
  accountType: "individual",
  company: "",
  purpose: "",
  headline: "",
  about: "",
  skills: "",
  experience: "",
  workMode: "",
  website: "",
};
export function validateProfile(
  value: ProfileDraft,
  role: string,
): string | null {
  const parsed = profileSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (value.accountType === "business" && !value.company.trim())
    return "Enter your business or organisation name.";
  if (role === "buyer" && !value.purpose)
    return "Select what you plan to use Fotizo for.";
  if (role === "seller") {
    if (value.headline.trim().length < 10)
      return "Add a professional headline of at least 10 characters.";
    if (value.about.trim().length < 80)
      return "Introduce your expertise and the work you deliver in at least 80 characters.";
    const skills = value.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length < 1 || skills.length > 10)
      return "Add between 1 and 10 skills, separated by commas.";
    if (!value.experience || !value.workMode)
      return "Select your experience and how you deliver your work.";
  }
  return null;
}
const key = (id: string) => `fotizo_profile_draft_v1:${id}`;
export function readProfileDraft(id: string): ProfileDraft {
  try {
    const value = JSON.parse(localStorage.getItem(key(id)) ?? "null");
    const parsed = profileSchema.safeParse(value);
    return parsed.success ? parsed.data : { ...emptyProfile };
  } catch {
    return { ...emptyProfile };
  }
}
export function saveProfileDraft(id: string, value: ProfileDraft): boolean {
  try {
    localStorage.setItem(key(id), JSON.stringify(profileSchema.parse(value)));
    return true;
  } catch {
    return false;
  }
}
export function clearProfileDraft(id: string): boolean {
  try {
    localStorage.removeItem(key(id));
    return true;
  } catch {
    return false;
  }
}

// The API stores stable codes for the choice fields; the form shows labels.
const PURPOSES: Record<string, string> = {
  "Shopping for myself": "shopping",
  "Hiring professionals": "hiring",
  "Buying for my business": "business_buying",
  "Shopping and hiring": "shopping_and_hiring",
};
const EXPERIENCE: Record<string, string> = {
  "Less than 1 year": "under_1",
  "1–3 years": "1_3",
  "3–5 years": "3_5",
  "5–10 years": "5_10",
  "10+ years": "over_10",
};
const WORK_MODES: Record<string, string> = {
  "On-site": "on_site",
  Remote: "remote",
  "On-site and remote": "on_site_and_remote",
  "Product sales": "product_sales",
};
const code = (map: Record<string, string>, label: string) => map[label] ?? "";
const label = (map: Record<string, string>, value: string) =>
  Object.keys(map).find((key) => map[key] === value) ?? "";

export function toProfileInput(value: ProfileDraft): AccountProfileInput {
  const parsed = profileSchema.parse(value);
  return {
    ...parsed,
    company: parsed.accountType === "business" ? parsed.company : "",
    purpose: code(PURPOSES, parsed.purpose),
    skills: parsed.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    experience: code(EXPERIENCE, parsed.experience),
    workMode: code(WORK_MODES, parsed.workMode),
  };
}

export function fromProfileInput(value: AccountProfileInput): ProfileDraft {
  return {
    country: value.country,
    city: value.city,
    language: value.language,
    accountType: value.accountType,
    company: value.company,
    purpose: label(PURPOSES, value.purpose),
    headline: value.headline,
    about: value.about,
    skills: value.skills.join(", "),
    experience: label(EXPERIENCE, value.experience),
    workMode: label(WORK_MODES, value.workMode),
    website: value.website,
  };
}

/** A browser draft from before profiles were saved to accounts, if valid. */
export function importableDraft(userId: string, role: string): ProfileDraft | null {
  const draft = readProfileDraft(userId);
  if (JSON.stringify(draft) === JSON.stringify(emptyProfile)) return null;
  return validateProfile(draft, role) ? null : draft;
}

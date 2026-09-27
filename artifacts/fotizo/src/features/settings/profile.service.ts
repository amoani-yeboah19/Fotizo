import { api, AUTH_USE_MOCKS } from "@/api";
import type { AccountProfileInput } from "@/types";
import { fromProfileInput, readProfileDraft, saveProfileDraft, toProfileInput, type ProfileDraft } from "./profile";

export interface PolicyAcceptance {
  policy: "terms" | "privacy";
  version: string;
  acceptedAt: string;
}

export interface StoredProfile {
  /** Null until the account saves a profile. */
  profile: ProfileDraft | null;
  /** Version last read; sent back so edits from elsewhere aren't overwritten. */
  version: number;
  /** Terms and Privacy Policy versions this account accepted, newest first. */
  accepted?: PolicyAcceptance[];
}

interface ProfileResponse {
  profile: (AccountProfileInput & { version: number }) | null;
  policies?: { accepted: PolicyAcceptance[] };
}

const stored = (profile: ProfileResponse["profile"]): StoredProfile =>
  profile ? { profile: fromProfileInput(profile), version: profile.version } : { profile: null, version: 0 };

export const profileService = {
  async get(userId: string): Promise<StoredProfile> {
    // Demo accounts have no server; their details stay in this browser.
    if (AUTH_USE_MOCKS) return { profile: readProfileDraft(userId), version: 0 };
    const response = await api.get<ProfileResponse>("/account/profile");
    return { ...stored(response.profile), accepted: response.policies?.accepted ?? [] };
  },

  async save(userId: string, value: ProfileDraft, expectedVersion: number): Promise<StoredProfile> {
    if (AUTH_USE_MOCKS) {
      if (!saveProfileDraft(userId, value)) throw new Error("Your browser could not save these details.");
      return { profile: value, version: 0 };
    }
    const saved = await api.put<ProfileResponse>("/account/profile", {
      expectedVersion,
      profile: toProfileInput(value),
    });
    return stored(saved.profile);
  },
};

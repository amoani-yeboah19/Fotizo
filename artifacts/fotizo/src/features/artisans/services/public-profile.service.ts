import { api } from "@/api";

/** GET /profiles/:userId — only what a professional publishes, never private details. */
export interface PublicProfile {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  joinedAt: string;
  headline: string;
  about: string;
  skills: string[];
  /** Codes; see profileChoiceLabel. */
  experience: string;
  workMode: string;
  website: string;
  services: {
    id: string;
    title: string;
    category: string;
    hourlyRate: number;
    rating: number;
    reviewCount: number;
    avatar: string;
  }[];
}

export const publicProfileService = {
  get: (userId: string) => api.get<PublicProfile>(`/profiles/${userId}`),
};

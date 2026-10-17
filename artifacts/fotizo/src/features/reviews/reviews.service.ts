import { api } from "@/api";

export type ReviewKind = "product" | "service";

export interface Review {
  id: string;
  rating: number;
  comment: string;
  /** First name and initial, e.g. "Ama K.". */
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewList {
  items: Review[];
  total: number;
  average: number | null;
  /** Number of 1- to 5-star reviews. */
  breakdown: number[];
}

export interface MyReview {
  /** A delivered order (products) or completed booking (services) lets them review. */
  canReview: boolean;
  review: Review | null;
}

export const reviewsService = {
  list: (kind: ReviewKind, id: string) => api.get<ReviewList>(`/${kind}s/${encodeURIComponent(id)}/reviews`),
  mine: (kind: ReviewKind, id: string) => api.get<MyReview>("/reviews/mine", { kind, id }),
  save: (input: { kind: ReviewKind; listingId: string; rating: number; comment: string }) =>
    api.put<Review>("/reviews", input),
  remove: (id: string) => api.del<void>(`/reviews/${id}`),
};

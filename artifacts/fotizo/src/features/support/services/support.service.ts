import { api, SUPPORT_USE_MOCKS } from "@/api";

// The topics a customer can raise. "not-received" is first deliberately — a
// package that hasn't arrived is the reason most people open this page.
export const SUPPORT_TOPICS = [
  { id: "not-received", label: "My order hasn't arrived" },
  { id: "damaged", label: "Something arrived damaged or wrong" },
  { id: "refund", label: "Refund or return" },
  { id: "vehicle", label: "Question about a vehicle order" },
  { id: "service", label: "Issue with a service provider" },
  { id: "account", label: "Account or payment" },
  { id: "other", label: "Something else" },
] as const;

export type SupportTopicId = (typeof SUPPORT_TOPICS)[number]["id"];

export interface SupportRequestInput {
  topic: SupportTopicId;
  /** Optional — a customer chasing a package may not have it to hand. */
  orderRef: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface SupportRequest extends SupportRequestInput {
  id: string;
  createdAt: string;
  status: string;
  /** Shown back to the customer so they can quote it when they follow up. */
  reference: string;
}

// Requests are stored server-side and worked by managers from the dashboard
// queue. Demo builds have no backend, so they cannot accept a request rather
// than pretending one was received.
export async function submitSupportRequest(
  input: SupportRequestInput,
): Promise<SupportRequest> {
  if (SUPPORT_USE_MOCKS) throw new Error("Support requests are unavailable in demo mode.");
  return api.post<SupportRequest>("/support-requests", input);
}

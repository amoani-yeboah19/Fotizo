import { api, SUPPORT_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";

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
  /** Shown back to the customer so they can quote it when they follow up. */
  reference: string;
}

// Mock mode only. A real backend needs POST /support-requests writing to a
// tickets table, joined to the order so an agent can see where the package
// actually is — plus a notification to whoever is on support. A ticket that
// only lives in browser memory is gone the moment the tab closes.
export const mockSupportRequests: SupportRequest[] = [];

function makeReference(): string {
  return `FZ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function submitSupportRequest(
  input: SupportRequestInput,
): Promise<SupportRequest> {
  if (SUPPORT_USE_MOCKS) {
    await delay();
    const request: SupportRequest = {
      ...input,
      id: `sr-${Date.now()}`,
      createdAt: new Date().toISOString(),
      reference: makeReference(),
    };
    mockSupportRequests.unshift(request);
    return request;
  }
  return api.post<SupportRequest>("/support-requests", input);
}

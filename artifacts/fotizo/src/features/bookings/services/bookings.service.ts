import { api, AUTH_USE_MOCKS } from "@/api";
import type { Booking, BookingStatus } from "@/types";

export interface BookingRequestInput {
  serviceId: string;
  packageName: string;
  /** ISO instant built from the customer's chosen local date and time. */
  scheduledFor: string;
  timezone: string;
  notes: string;
}

// Booking requests live on the server. Demo builds have no session, so they
// list nothing and cannot send requests.
export const bookingsService = {
  async list(): Promise<Booking[]> {
    if (AUTH_USE_MOCKS) return [];
    return api.get<Booking[]>("/bookings");
  },
  async listIncoming(): Promise<Booking[]> {
    if (AUTH_USE_MOCKS) return [];
    return api.get<Booking[]>("/provider/bookings");
  },
  async request(input: BookingRequestInput): Promise<Booking> {
    if (AUTH_USE_MOCKS) throw new Error("Booking is unavailable in demo mode.");
    return api.post<Booking>("/bookings", input);
  },
  async changeStatus(
    id: string,
    change: { status: Exclude<BookingStatus, "requested">; expectedVersion: number; note?: string; meetingLink?: string },
  ) {
    return api.post<{ id: string; status: BookingStatus; statusVersion: number }>(`/bookings/${id}/status`, change);
  },
};

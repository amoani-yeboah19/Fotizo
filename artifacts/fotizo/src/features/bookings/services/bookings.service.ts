import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Booking } from "@/types";

export const bookingsService = {
  async listBookings(): Promise<Booking[]> {
    if (USE_MOCKS) {
      await delay();
      return fx.mockBookings;
    }
    return api.get<Booking[]>("/bookings");
  },
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { bookingsService } from "./services";
import type { BookingStatus } from "@/types";

/** Bookings the signed-in customer requested. */
export const useBookings = () => {
  const { user, isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["bookings", user?.id], queryFn: bookingsService.list, enabled: isAuthenticated });
};

/** Booking requests for the signed-in provider's services. */
export const useIncomingBookings = () => {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["provider-bookings", user?.id],
    queryFn: bookingsService.listIncoming,
    enabled: isAuthenticated,
  });
};

export const useRequestBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bookingsService.request,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};

export const useChangeBookingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...change
    }: {
      id: string;
      status: Exclude<BookingStatus, "requested">;
      expectedVersion: number;
      note?: string;
      meetingLink?: string;
    }) => bookingsService.changeStatus(id, change),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["provider-bookings"] });
    },
  });
};

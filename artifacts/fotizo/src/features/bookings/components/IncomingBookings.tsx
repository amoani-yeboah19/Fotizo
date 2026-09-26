import { useState } from "react";
import { Calendar } from "lucide-react";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/api";
import { useChangeBookingStatus, useIncomingBookings } from "@/features/bookings/hooks";
import type { Booking, BookingStatus } from "@/types";

const tone = (s: BookingStatus) =>
  s === "confirmed" || s === "completed" ? "success" : s === "requested" ? "warning" : "danger";

function IncomingBooking({ booking }: { booking: Booking }) {
  const { toast } = useToast();
  const change = useChangeBookingStatus();
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const when = new Date(booking.scheduledFor);

  const move = (status: Exclude<BookingStatus, "requested">) =>
    change.mutate(
      {
        id: booking.id,
        status,
        expectedVersion: booking.statusVersion,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(status === "confirmed" && link.trim() ? { meetingLink: link.trim() } : {}),
      },
      {
        onSuccess: () => toast({ title: `Booking ${status}`, description: booking.reference }),
        onError: (error) =>
          toast({
            variant: "destructive",
            title: "Booking not updated",
            description: apiErrorMessage(error, "Please try again."),
          }),
      },
    );

  return (
    <li className="p-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{when.toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <StatusBadge tone={tone(booking.status)}>{booking.status}</StatusBadge>
        </div>
        <p className="font-medium">
          {booking.serviceTitle} · {booking.package} · <Price amount={booking.price} />
        </p>
        <p className="text-muted-foreground">
          {booking.buyer} · {booking.reference} · booked from {booking.timezone}
        </p>
        {booking.notes && <p className="mt-2 whitespace-pre-wrap">“{booking.notes}”</p>}
      </div>
      {(booking.status === "requested" || booking.status === "confirmed") && (
        <div className="flex w-full flex-col gap-2 lg:w-72">
          <Input
            aria-label="Note to the customer (optional)"
            placeholder="Note to the customer (optional)"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
          />
          {booking.status === "requested" ? (
            <>
              <Input
                aria-label="Meeting link for online sessions (optional)"
                placeholder="Meeting link, if online (optional)"
                value={link}
                maxLength={500}
                onChange={(e) => setLink(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={change.isPending} onClick={() => move("confirmed")}>
                  Confirm
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-destructive" disabled={change.isPending} onClick={() => move("declined")}>
                  Decline
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={change.isPending} onClick={() => move("completed")}>
                Mark completed
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-destructive" disabled={change.isPending} onClick={() => move("cancelled")}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** A provider's incoming booking requests, soonest first. */
export function IncomingBookings() {
  const { data, isLoading, isError, refetch } = useIncomingBookings();
  const bookings = [...(data ?? [])].reverse();
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-bold">Booking requests</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Times are shown in your local time.</p>
      </div>
      {isLoading ? (
        <p role="status" className="p-6 text-sm text-muted-foreground">Loading bookings…</p>
      ) : isError ? (
        <div role="alert" className="p-6 text-sm">
          Bookings could not be loaded.{" "}
          <Button variant="link" className="p-0 h-auto" onClick={() => void refetch()}>Retry</Button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 font-semibold text-foreground">No booking requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">When a customer books one of your services, it appears here.</p>
        </div>
      ) : (
        <ul className="divide-y border-border">
          {bookings.map((b) => (
            <IncomingBooking key={b.id} booking={b} />
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { CalendarClock, Check, Clock, Copy, ExternalLink, MessageSquareQuote, Package, Video, X } from "lucide-react";
import { Price } from "@/components/common/Price";
import { StatusBadge, type BadgeTone } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InitialsAvatar } from "@/components/common/InitialsAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/api";
import { useChangeBookingStatus } from "@/features/bookings/hooks";
import type { Booking } from "@/types";

const STATUS: Record<Booking["status"], { label: string; tone: BadgeTone; hint: string }> = {
  requested: {
    label: "Awaiting confirmation",
    tone: "warning",
    hint: "The provider has your request and will confirm or decline it.",
  },
  confirmed: { label: "Confirmed", tone: "success", hint: "You're booked in. Join or meet at the time shown." },
  declined: { label: "Declined", tone: "danger", hint: "The provider couldn't take this booking." },
  cancelled: { label: "Cancelled", tone: "neutral", hint: "This booking was cancelled." },
  completed: { label: "Completed", tone: "info", hint: "This service has been delivered." },
};

const isOpen = (b: Booking) => b.status === "requested" || b.status === "confirmed";

/** "Today", "Tomorrow", "In 3 days", "2 days ago" — by calendar day in the viewer's zone. */
function relativeDay(date: Date) {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(new Date())) / 86_400_000);
  if (days === 0) return "Today";
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(days, "day").replace(/^./, (c) => c.toUpperCase());
}

const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The time in the zone the customer booked from, when it differs from where they are now. */
function bookedZoneTime(booking: Booking, when: Date) {
  if (!booking.timezone || booking.timezone === viewerZone()) return null;
  try {
    const time = when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: booking.timezone });
    return `${time} ${booking.timezone.replaceAll("_", " ")} time`;
  } catch {
    return null;
  }
}

function ProviderAvatar({ booking, size }: { booking: Booking; size: string }) {
  return booking.providerAvatar ? (
    <img loading="lazy" decoding="async" src={booking.providerAvatar} alt="" className={`${size} rounded-full object-cover bg-muted shrink-0`} />
  ) : (
    <InitialsAvatar name={booking.provider} className={`${size} text-[10px] shrink-0`} />
  );
}

/** Steps a booking passes through; closed bookings end at their final state. */
function Progress({ booking }: { booking: Booking }) {
  const steps =
    booking.status === "declined" || booking.status === "cancelled"
      ? [{ label: "Requested", done: true }, { label: STATUS[booking.status].label, done: true, stop: true }]
      : [
          { label: "Requested", done: true },
          { label: "Confirmed", done: booking.status === "confirmed" || booking.status === "completed" },
          { label: "Completed", done: booking.status === "completed" },
        ];
  return (
    <ol className="flex items-center gap-2" aria-label="Booking progress">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-center gap-2 text-xs">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
              "stop" in step && step.stop
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : step.done
                  ? "border-primary bg-primary text-white"
                  : "border-border text-muted-foreground"
            }`}
          >
            {"stop" in step && step.stop ? <X className="h-3 w-3" aria-hidden="true" /> : step.done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
          </span>
          <span className={step.done ? "font-medium text-foreground" : "text-muted-foreground"}>{step.label}</span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-border" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** A customer's service booking: a summary card that opens the full details. */
export function MyBookingCard({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const { toast } = useToast();
  const change = useChangeBookingStatus();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const when = new Date(booking.scheduledFor);
  const status = STATUS[booking.status];
  const open = isOpen(booking);
  const upcoming = open && when.getTime() >= Date.now();
  const time = when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const otherZone = bookedZoneTime(booking, when);
  const canJoin = booking.status === "confirmed" && !!booking.meetingLink;

  const cancel = () =>
    change.mutate(
      { id: booking.id, status: "cancelled", expectedVersion: booking.statusVersion },
      {
        onSuccess: () => {
          setConfirmCancel(false);
          setDetailsOpen(false);
          toast({ title: "Booking cancelled", description: booking.reference });
        },
        onError: (error) =>
          toast({ variant: "destructive", title: "Booking not cancelled", description: apiErrorMessage(error, "Please try again.") }),
      },
    );

  const joinButton = canJoin && (
    <a href={booking.meetingLink!} target="_blank" rel="noopener noreferrer">
      <Button size="sm" className="gap-2">
        <Video className="h-4 w-4" aria-hidden="true" /> Join
      </Button>
    </a>
  );

  return (
    <>
      <article
        className={`rounded-xl border border-border p-4 transition-colors hover:border-primary/30 ${open ? "bg-white" : "bg-muted/30"}`}
      >
        <div className="flex gap-4">
          {/* Calendar tile: the day is the first thing people look for. */}
          <div
            className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-2 text-center ${
              upcoming ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
            aria-hidden="true"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {when.toLocaleDateString(undefined, { month: "short" })}
            </span>
            <span className="text-xl font-bold leading-tight">{when.getDate()}</span>
            <span className="text-[10px]">{when.toLocaleDateString(undefined, { weekday: "short" })}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 font-semibold text-sm leading-snug line-clamp-2">{booking.serviceTitle}</h3>
              <StatusBadge tone={status.tone} className="shrink-0">
                {status.label}
              </StatusBadge>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <ProviderAvatar booking={booking} size="h-5 w-5" />
              <span className="truncate">
                {booking.provider} · {booking.package}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5 text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{time}</span>
                <span className="text-muted-foreground">· {relativeDay(when)}</span>
              </span>
              <Price amount={booking.price} className="font-semibold" />
            </div>
            {!compact && booking.providerNote && (
              <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
                <MessageSquareQuote className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="line-clamp-2">{booking.providerNote}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {joinButton}
              <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>
                View details
              </Button>
              {open && !compact && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={change.isPending}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel booking
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6 leading-snug">{booking.serviceTitle}</DialogTitle>
            <DialogDescription>{status.hint}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ProviderAvatar booking={booking} size="h-10 w-10" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{booking.provider}</p>
                <p className="text-xs text-muted-foreground">Service provider</p>
              </div>
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>

          <Progress booking={booking} />

          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
            <Detail label="Date">
              {when.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </Detail>
            <Detail label="Time">
              {time} <span className="font-normal text-muted-foreground">· {relativeDay(when)}</span>
              {otherZone && <span className="block text-xs font-normal text-muted-foreground">Booked as {otherZone}</span>}
            </Detail>
            <Detail label="Package">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> {booking.package}
              </span>
            </Detail>
            <Detail label="Price">
              <Price amount={booking.price} />
            </Detail>
            <Detail label="Reference">
              <span className="flex items-center gap-1.5 font-mono text-xs">
                {booking.reference}
                <button
                  type="button"
                  aria-label="Copy booking reference"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(booking.reference).then(
                      () => toast({ title: "Reference copied", description: booking.reference }),
                      () => undefined,
                    );
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </Detail>
            <Detail label="Requested">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {new Date(booking.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            </Detail>
          </dl>

          {booking.notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your notes</h4>
              <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}
          {booking.providerNote && (
            <div className="rounded-xl bg-muted/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Message from {booking.provider}
              </h4>
              <p className="text-sm whitespace-pre-wrap">{booking.providerNote}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Link href={`/services/${booking.serviceId}`} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              View service <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <div className="flex flex-wrap gap-2">
              {open && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={change.isPending}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel booking
                </Button>
              )}
              {joinButton}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this booking?"
        description={`${booking.serviceTitle} with ${booking.provider} on ${when.toLocaleDateString(undefined, { dateStyle: "medium" })} at ${time}. The provider will see that you cancelled.`}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        destructive
        loading={change.isPending}
        onConfirm={cancel}
      />
    </>
  );
}

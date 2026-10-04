import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ShieldCheck, ShieldAlert, Clock, Loader2 } from "lucide-react";
import { AUTH_USE_MOCKS, apiErrorMessage } from "@/api";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge, type BadgeTone } from "@/components/common/StatusBadge";
import { Loading } from "@/components/common/QueryStates";
import { Button } from "@/components/ui/button";
import { useIdentity, useIdentityActions, type IdentitySummary } from "./identity.service";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

const BADGE: Record<IdentitySummary["status"], { label: string; tone: BadgeTone }> = {
  none: { label: "Not verified", tone: "neutral" },
  pending: { label: "In progress", tone: "warning" },
  review: { label: "Being reviewed", tone: "info" },
  approved: { label: "Verified", tone: "success" },
  declined: { label: "Not verified", tone: "danger" },
  resubmission_requested: { label: "Action needed", tone: "warning" },
};

/** What the seller sees about their identity check, and what to do next. */
function describe(summary: IdentitySummary) {
  const submitted = summary.session?.status === "submitted";
  switch (summary.status) {
    case "approved":
      return {
        title: "Your identity is verified",
        text: `Verified ${summary.verifiedAt ? `on ${formatDate(summary.verifiedAt)}` : ""}. Buyers see an "ID verified" badge on your profile.`,
        action: null,
      };
    case "pending":
      return submitted
        ? { title: "We're checking your documents", text: "This usually takes a few minutes. This page updates when the result is in.", action: "check" as const }
        : { title: "Finish your identity check", text: "You started an identity check but haven't finished it yet.", action: "continue" as const };
    case "review":
      return {
        title: "Our team is reviewing your check",
        text: "Your check needs a closer look, for example because the name on your document differs from your account name. We'll update you here.",
        action: null,
      };
    case "declined":
      return {
        title: "We couldn't verify your identity",
        text: summary.session?.reason
          ? `Reason: ${summary.session.reason}. Contact support and our team will help.`
          : "Contact support and our team will help.",
        action: "support" as const,
      };
    case "resubmission_requested":
      return {
        title: "Please try your identity check again",
        text: summary.session?.reason ? `Reason: ${summary.session.reason}.` : "The documents couldn't be read clearly.",
        action: "start" as const,
      };
    default:
      return {
        title: "Verify your identity",
        text: "Sellers on Fotizo verify their identity once. It takes a few minutes: you'll photograph an ID document (Ghana Card, passport or driver's licence) and take a selfie.",
        action: "start" as const,
      };
  }
}

/** The seller's identity verification panel, with Veriff's check in a window. */
export function IdentityVerification() {
  const { data: summary, isLoading, isError, error, refetch } = useIdentity();
  const { start, refresh } = useIdentityActions();
  const [message, setMessage] = useState("");
  const checked = useRef(false);

  // Returning from Veriff (or an unfinished check): ask for the result once.
  useEffect(() => {
    if (summary?.status === "pending" && !checked.current) {
      checked.current = true;
      refresh.mutate();
    }
  }, [summary?.status, refresh]);

  if (AUTH_USE_MOCKS) return <p className="text-sm text-muted-foreground">Identity checks are available for live accounts.</p>;
  if (isLoading) return <Loading label="Loading your verification…" />;
  if (isError || !summary)
    return (
      <SurfaceCard className="p-6 space-y-3">
        <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, "We couldn't load your verification.")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
      </SurfaceCard>
    );

  const view = describe(summary);
  const badge = BADGE[summary.status];
  const busy = start.isPending || refresh.isPending;

  const open = async () => {
    setMessage("");
    try {
      const { url } = await start.mutateAsync();
      // Veriff's own window over the page; documents never pass through Fotizo.
      const { createVeriffFrame, MESSAGES } = await import("@veriff/incontext-sdk");
      createVeriffFrame({
        url,
        onEvent: (event) => {
          if (event === MESSAGES.FINISHED || event === MESSAGES.SUBMITTED) {
            setMessage("Thanks — we're checking your documents now.");
            refresh.mutate();
          } else if (event === MESSAGES.CANCELED) {
            void refetch();
          }
        },
      });
    } catch (e) {
      setMessage(apiErrorMessage(e, "The identity check couldn't be opened. Please try again."));
    }
  };

  const Icon = summary.status === "approved" ? ShieldCheck : summary.status === "pending" || summary.status === "review" ? Clock : ShieldAlert;

  return (
    <SurfaceCard className="p-6 space-y-4">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            summary.status === "approved" ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{view.title}</h2>
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{view.text}</p>
        </div>
      </div>

      {summary.status !== "approved" && (
        <p className={`rounded-xl p-3 text-sm ${summary.listingsVisible ? "bg-muted/50" : "bg-amber-50 text-amber-900"}`}>
          {!summary.listingsVisible
            ? "Your listings are hidden from buyers until your identity is verified."
            : summary.dueBy
              ? `Verify by ${formatDate(summary.dueBy)} to keep your listings visible to buyers.`
              : "Verified sellers get an “ID verified” badge, and verification will soon be required to list on Fotizo."}
        </p>
      )}

      {(view.action === "start" || view.action === "continue") && (
        <div className="space-y-2">
          <Button onClick={open} disabled={busy || !summary.available}>
            {start.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {view.action === "continue" ? "Continue verification" : summary.status === "none" ? "Verify your identity" : "Try again"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {summary.available
              ? "Your check is handled by Veriff, our identity partner. Fotizo receives only the result, not your document images. By continuing you agree to Veriff processing your ID document and selfie for this check."
              : "Identity checks open soon. We'll let you know when you can verify."}
          </p>
        </div>
      )}
      {view.action === "check" && (
        <Button variant="outline" onClick={() => refresh.mutate()} disabled={busy}>
          {refresh.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Check for the result
        </Button>
      )}
      {view.action === "support" && (
        <Link href="/support">
          <Button variant="outline">Contact support</Button>
        </Link>
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </SurfaceCard>
  );
}

/** A short prompt on the seller dashboard until the seller is verified. */
export function IdentityPrompt({ onOpen }: { onOpen: () => void }) {
  const { data: summary } = useIdentity();
  if (!summary?.required || summary.status === "approved") return null;
  const urgent = !summary.listingsVisible || summary.status === "resubmission_requested";
  return (
    <div
      className={`mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        urgent ? "border-amber-300 bg-amber-50" : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">
            {summary.status === "pending" || summary.status === "review" ? "Your identity check is in progress." : "Verify your identity."}
          </span>{" "}
          {!summary.listingsVisible
            ? "Your listings are hidden from buyers until you're verified."
            : summary.dueBy
              ? `Verify by ${formatDate(summary.dueBy)} to keep your listings visible.`
              : "Verified sellers get an ID verified badge buyers can trust."}
        </p>
      </div>
      <Button size="sm" variant={urgent ? "default" : "outline"} onClick={onOpen} className="shrink-0">
        {summary.status === "pending" || summary.status === "review" ? "View status" : "Verify now"}
      </Button>
    </div>
  );
}

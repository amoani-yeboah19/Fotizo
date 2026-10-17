import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { AUTH_USE_MOCKS, apiErrorMessage } from "@/api";
import { Button } from "@/components/ui/button";
import { disablePush, enablePush, pushState, syncPushSubscription, type PushState } from "./push";

/**
 * For sellers and Fotizo staff: turns on push notifications on this device, so
 * a buyer's urgent alert about an overdue order reaches them even when they
 * aren't on Fotizo. Alerts are also emailed.
 */
export function UrgentAlertsToggle() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    void pushState().then((s) => {
      if (!live) return;
      setState(s);
      if (s === "on") void syncPushSubscription().catch(() => undefined);
    });
    return () => {
      live = false;
    };
  }, []);

  if (AUTH_USE_MOCKS || state === "loading") return null;

  const toggle = async () => {
    setBusy(true);
    setError(undefined);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch (e) {
      setError(apiErrorMessage(e, "Notifications couldn't be changed on this device. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4 text-sm flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 max-w-xl">
        <p className="flex items-center gap-2 font-semibold">
          <BellRing className="h-4 w-4" aria-hidden="true" /> Urgent order alerts
        </p>
        <p className="mt-1 text-muted-foreground" role="status">
          {state === "on"
            ? "On for this device. You'll get a notification when a buyer is waiting on an overdue order, even when you're away from Fotizo."
            : state === "blocked"
              ? "Notifications are blocked for Fotizo in this browser. Allow them in your browser's site settings to get urgent alerts here."
              : state === "unsupported"
                ? "This browser can't receive notifications. On iPhone, add Fotizo to your Home Screen first. Urgent alerts still arrive by email."
                : "Get a notification on this device when a buyer is waiting on an overdue order. Urgent alerts are also emailed."}
        </p>
        {error && (
          <p className="mt-1 text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      {(state === "on" || state === "off") && (
        <Button size="sm" variant={state === "on" ? "outline" : "default"} disabled={busy} onClick={() => void toggle()}>
          {busy ? "Please wait…" : state === "on" ? "Turn off" : "Turn on alerts"}
        </Button>
      )}
    </div>
  );
}

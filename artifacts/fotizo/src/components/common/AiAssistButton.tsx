import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { ApiError } from "@/api";
import { useToast } from "@/hooks/use-toast";

// Small "✨ Write it for me" button used by the posting wizards. Owns its busy
// state and surfaces the backend's helpful messages (e.g. the 503 "AI writing
// isn't configured yet" or the hourly rate-limit notice) as a toast.
export function AiAssistButton({
  label = "Write it for me",
  busyLabel = "Writing…",
  disabled,
  run,
}: {
  label?: string;
  busyLabel?: string;
  disabled?: boolean;
  run: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const onClick = async () => {
    setBusy(true);
    try {
      await run();
    } catch (err) {
      const description =
        err instanceof ApiError &&
        err.data &&
        typeof err.data === "object" &&
        "error" in err.data
          ? String((err.data as { error: unknown }).error)
          : "AI writing failed. Please try again.";
      toast({ variant: "destructive", title: "Couldn't generate", description });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {busy ? busyLabel : label}
    </button>
  );
}

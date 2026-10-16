import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, AUTH_USE_MOCKS } from "@/api";
import {
  suggestFromPhotos,
  type PhotoListingDraft,
} from "@/services/ai.service";

/** Analyses newly uploaded photos; callers fill empty fields only. */
export function PhotoListingAssist({
  images,
  kind,
  onDraft,
  disabled = false,
}: {
  images: string[];
  kind: "product" | "service" | "vehicle";
  onDraft: (draft: PhotoListingDraft) => void;
  disabled?: boolean;
}) {
  const key = JSON.stringify(images.slice(0, 3));
  const previous = useRef(key);
  const latest = useRef(key);
  latest.current = key;
  const apply = useRef(onDraft);
  apply.current = onDraft;
  const mounted = useRef(true);
  const sequence = useRef(0);
  const inFlight = useRef<{ key: string; revision: number } | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<PhotoListingDraft | null>(null);
  const request = useRef<() => void>(() => {});
  request.current = async () => {
    if (!images.length || disabled || AUTH_USE_MOCKS) return;
    if (
      inFlight.current?.key === key &&
      inFlight.current.revision === sequence.current
    )
      return;
    const revision = ++sequence.current;
    inFlight.current = { key, revision };
    setState("busy");
    setError("");
    setSuggestion(null);
    try {
      const draft = await suggestFromPhotos(kind, images);
      if (
        !mounted.current ||
        latest.current !== key ||
        revision !== sequence.current
      )
        return;
      apply.current(draft);
      setSuggestion(draft);
      setState("done");
    } catch (err) {
      if (
        !mounted.current ||
        latest.current !== key ||
        revision !== sequence.current
      )
        return;
      setError(
        apiErrorMessage(
          err,
          "Photo suggestions failed. You can still fill in the form manually.",
        ),
      );
      setState("error");
    } finally {
      if (inFlight.current?.revision === revision) inFlight.current = null;
    }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (previous.current === key || disabled) return;
    previous.current = key;
    ++sequence.current;
    setState("idle");
    setSuggestion(null);
    if (!images.length || disabled) return;
    const timer = setTimeout(() => request.current(), 500);
    return () => clearTimeout(timer);
  }, [key, disabled, images.length]);
  if (!images.length || AUTH_USE_MOCKS) return null;
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 text-sm">
      <p className="font-medium">AI details from photos</p>
      <p className="text-xs text-muted-foreground">
        New photos are analysed by Anthropic to fill empty fields. Review the
        suggestions before saving. Prices and details the photos cannot confirm
        stay for you to enter.
      </p>
      <p role="status">
        {state === "busy"
          ? "Looking at your photos…"
          : state === "done"
            ? "Suggestions ready. Empty fields have been filled; your existing entries were kept."
            : "Get a draft from up to three uploaded photos."}
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {suggestion && (
        <details>
          <summary className="cursor-pointer">Review AI suggestions</summary>
          <p className="font-medium mt-2">{suggestion.title}</p>
          <p className="whitespace-pre-line">{suggestion.description}</p>
          {suggestion.specs.map((s, i) => (
            <p key={i}>
              {s.name}: {s.value}
            </p>
          ))}
        </details>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || state === "busy"}
        onClick={() => request.current()}
      >
        {state === "error" ? "Retry photo suggestions" : "Suggest from photos"}
      </Button>
    </div>
  );
}

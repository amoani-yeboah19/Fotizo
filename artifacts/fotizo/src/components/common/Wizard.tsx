import type { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WizardShellProps {
  steps: string[];
  current: number;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

// Presentational multi-step wizard: progress stepper + step content + Back/Next
// (or submit) nav. The parent owns step state, per-step validation, and submission.
export function WizardShell({
  steps,
  current,
  children,
  onBack,
  onNext,
  onSubmit,
  submitting = false,
  submitLabel = "Publish",
}: WizardShellProps) {
  const isLast = current === steps.length - 1;
  const pct = Math.round(((current + 1) / steps.length) * 100);

  return (
    <div>
      {/* Stepper */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-between gap-2 mb-3">
          {steps.map((label, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={label} className="flex items-center gap-2 min-w-0">
                <span
                  aria-current={active ? "step" : undefined}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    done || active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="w-4 h-4" aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={`hidden sm:block text-sm font-medium truncate ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </nav>

      {/* Step content */}
      <div className="space-y-5">{children}</div>

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={current === 0 || submitting}>
          Back
        </Button>
        {isLast ? (
          <Button type="button" onClick={onSubmit} disabled={submitting} className="gap-2 min-w-32">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {submitting ? "Publishing…" : submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={onNext}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

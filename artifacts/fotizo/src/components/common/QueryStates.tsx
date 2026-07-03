// Shared async-state helpers so pages consuming service hooks stay DRY.

export function Loading({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center py-24 text-muted-foreground ${className}`}
    >
      <span className="h-6 w-6 mr-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  label = "Something went wrong. Please try again.",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center py-24 text-center text-destructive ${className}`}
    >
      {label}
    </div>
  );
}

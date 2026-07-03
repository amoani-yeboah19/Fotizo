// Theme-aligned chart styling. recharts needs JS props (not CSS classes), so these
// centralize the values the dashboards used to hardcode as hex, mapped to theme tokens
// (so they follow light/dark mode). `hsl(var(--…))` resolves in recharts' SVG output,
// matching the existing `hsl(var(--primary))` fills already in use.

export const chartColors = {
  grid: "hsl(var(--border))", // was #E2E8F0
  axis: "hsl(var(--muted-foreground))", // was #64748B
  cursor: "hsl(var(--muted))", // was #F1F5F9 / #cbd5e1
  primary: "hsl(var(--primary))",
};

export const chartAxisTick = { fill: chartColors.axis, fontSize: 12 };

export const chartTooltipStyle = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "var(--shadow-md)",
};

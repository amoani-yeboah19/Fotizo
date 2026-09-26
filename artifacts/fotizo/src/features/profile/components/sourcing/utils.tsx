import { useState } from "react";
export function csvText(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let text = String(value ?? "");
          if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
export function exportCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff", csvText(rows)], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function RecordImage({
  src,
  title,
  large = false,
}: {
  src: string;
  title: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState("");
  const style = large ? "h-64 w-full" : "h-14 w-14 shrink-0";
  return src && failed !== src ? (
    <img
      src={src}
      alt={title}
      loading="lazy"
      onError={() => setFailed(src)}
      className={`${style} rounded-lg border bg-white object-contain p-1`}
    />
  ) : (
    <span
      role="img"
      aria-label={`No image for ${title}`}
      className={`${style} flex items-center justify-center rounded-lg bg-muted text-center text-xs text-muted-foreground`}
    >
      No image
    </span>
  );
}
export const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm";

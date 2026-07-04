import { useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Label + optional hint/error wrapper used by the posting wizards.
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50";

// Native <select> styled to match the Input. Register-friendly via spread props.
export function NativeSelect({
  options,
  placeholder = "Select…",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: string[]; placeholder?: string }) {
  return (
    <select className={selectClass} {...props}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// Add image URLs with live thumbnail previews. Files can't persist without storage,
// so we take URLs (matches the existing catalog data).
export function ImageUrlInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [url, setUrl] = useState("");
  const add = () => {
    const u = url.trim();
    if (u && !value.includes(u)) onChange([...value, u]);
    setUrl("");
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://…/photo.jpg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          aria-label="Image URL"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add
        </button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {value.map((src, i) => (
            <li
              key={src}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img src={src} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((s) => s !== src))}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Add free-text tags/skills as removable chips.
export function TagsInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setText("");
  };
  return (
    <div className="space-y-2">
      <Input
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

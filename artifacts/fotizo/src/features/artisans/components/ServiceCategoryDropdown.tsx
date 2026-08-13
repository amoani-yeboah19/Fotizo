import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Laptop, Hammer, Building2, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  SERVICE_GROUPS,
  categoriesInGroup,
  serviceCategoryLabel,
  serviceGroupLabel,
  type ServiceGroupId,
} from "@workspace/service-taxonomy";

// What the listing is currently filtered to. `group` alone means "everything in
// this group"; `category` narrows to one trade within it.
export interface ServiceFilter {
  group: ServiceGroupId | null;
  category: string | null;
}

export const ALL_SERVICES: ServiceFilter = { group: null, category: null };

// The taxonomy names its icons as strings so the package stays dependency-free;
// the mapping to actual components lives here, in the UI layer.
const GROUP_ICONS: Record<string, LucideIcon> = { Laptop, Hammer, Building2 };

function filterLabel(filter: ServiceFilter): string {
  if (filter.category) return serviceCategoryLabel(filter.category);
  if (filter.group) return `All ${serviceGroupLabel(filter.group)}`;
  return "All services";
}

export function ServiceCategoryDropdown({
  value,
  onChange,
  className = "",
}: {
  value: ServiceFilter;
  onChange: (next: ServiceFilter) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape — the panel is wide, so it's easy to
  // leave it hanging open otherwise.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (next: ServiceFilter) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className="truncate">{filterLabel(value)}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-2 max-h-[26rem] w-[19rem] overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-xl sm:w-[34rem]"
        >
          <FilterRow
            label="All services"
            hint="Every provider on Fotizo"
            icon={LayoutGrid}
            selected={!value.group && !value.category}
            onSelect={() => pick(ALL_SERVICES)}
          />

          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {SERVICE_GROUPS.map((group) => {
              const Icon = GROUP_ICONS[group.icon] ?? LayoutGrid;
              return (
                <div key={group.id} className="rounded-lg p-1">
                  <FilterRow
                    label={group.label}
                    hint={group.tagline}
                    icon={Icon}
                    selected={value.group === group.id && !value.category}
                    onSelect={() => pick({ group: group.id, category: null })}
                  />
                  <ul className="mt-0.5 space-y-0.5 pl-2">
                    {categoriesInGroup(group.id).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => pick({ group: group.id, category: c.id })}
                          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                            value.category === c.id
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="truncate">{c.label}</span>
                          {value.category === c.id && (
                            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  hint,
  icon: Icon,
  selected,
  onSelect,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
        selected ? "bg-primary/10" : "hover:bg-muted"
      }`}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          selected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
          {label}
        </span>
        <span className="block text-xs leading-snug text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

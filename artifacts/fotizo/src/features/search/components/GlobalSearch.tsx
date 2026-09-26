import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Price } from "@/components/common/Price";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MIN_SEARCH_LENGTH, searchLinks, searchService, type GlobalSearchResults } from "../services/search.service";

type Suggestion = { key: string; group: string; href: string; title: string; detail: string; image?: string; price?: number };

const SUGGESTIONS_PER_GROUP = 3;

/** Flattens grouped results into the order they're shown and navigated. */
function suggestionsFrom(results: GlobalSearchResults | undefined): Suggestion[] {
  if (!results) return [];
  const take = <T,>(items: T[]) => items.slice(0, SUGGESTIONS_PER_GROUP);
  return [
    ...take(results.products.items).map((p) => ({
      key: `p-${p.id}`,
      group: "Products",
      href: searchLinks.product(p),
      title: p.title,
      detail: p.seller,
      image: p.image,
      price: p.price,
    })),
    ...take(results.shop.items).map((p) => ({
      key: `s-${p.id}`,
      group: "Fotizo Shop",
      href: searchLinks.shop(p),
      title: p.title,
      detail: p.category,
      image: p.image,
      price: p.price,
    })),
    ...take(results.services.items).map((s) => ({
      key: `v-${s.id}`,
      group: "Services",
      href: searchLinks.service(s),
      title: s.title,
      detail: s.provider,
      image: s.avatar,
      price: s.hourlyRate,
    })),
    ...take(results.vehicles.items).map((v) => ({
      key: `a-${v.id}`,
      group: "Vehicles",
      href: searchLinks.vehicle(v),
      title: `${v.make} ${v.model}`,
      detail: "Fotizo Autos",
      image: v.image,
      price: v.landedPrice,
    })),
  ];
}

/**
 * The navbar's search across products, the Fotizo Shop, services and
 * vehicles. Typing shows the best matches; Enter opens the full results page.
 */
export function GlobalSearch({ variant = "desktop", onNavigate }: { variant?: "desktop" | "mobile"; onNavigate?: () => void }) {
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const q = useDebouncedValue(text.trim(), 250);
  const ready = q.length >= MIN_SEARCH_LENGTH;
  const { data, isFetching, isError } = useQuery({
    queryKey: ["global-search", q],
    queryFn: () => searchService.global(q, SUGGESTIONS_PER_GROUP),
    enabled: ready,
    staleTime: 30_000,
  });
  const suggestions = useMemo(() => (ready ? suggestionsFrom(data) : []), [data, ready]);
  const total = data ? data.products.total + data.shop.total + data.services.total + data.vehicles.total : 0;

  // Close when focus or a click moves elsewhere on the page.
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => setActive(-1), [q]);

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    onNavigate?.();
    setLocation(href);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = text.trim();
    if (active >= 0 && suggestions[active]) return go(suggestions[active].href);
    if (query.length >= MIN_SEARCH_LENGTH) go(searchLinks.page(query));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  };

  const showPanel = open && text.trim().length >= MIN_SEARCH_LENGTH;
  const inputClass =
    variant === "desktop"
      ? "w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-transparent focus:bg-white focus:border-primary/30 rounded-full text-sm outline-none transition-all"
      : "w-full pl-10 pr-4 py-3 bg-muted border border-transparent rounded-lg text-sm outline-none";

  return (
    <div ref={box} className="relative w-full">
      <form role="search" onSubmit={submit}>
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={variant === "desktop" ? "Search products, services..." : "Search..."}
          aria-label="Search products and services"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && suggestions[active] ? `${listId}-${active}` : undefined}
          className={inputClass}
        />
      </form>
      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-[60vh] overflow-y-auto py-2">
            {suggestions.map((s, i) => (
              <li key={s.key} role="presentation">
                {(i === 0 || suggestions[i - 1].group !== s.group) && (
                  <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.group}
                  </p>
                )}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(s.href)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2 ${i === active ? "bg-muted" : ""}`}
                >
                  {s.image ? (
                    <img src={s.image} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md bg-muted object-cover" />
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-md bg-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{s.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.detail}</span>
                  </span>
                  {s.price !== undefined && <Price amount={s.price} className="shrink-0 text-sm font-semibold" />}
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-4 py-3 text-sm">
            {!ready || (isFetching && !data) ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Searching…
              </span>
            ) : isError ? (
              <span className="text-muted-foreground">Search isn't available right now. Please try again.</span>
            ) : total === 0 ? (
              <span className="text-muted-foreground">No results for “{q}”.</span>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(searchLinks.page(text.trim()))}
                className="font-medium text-primary hover:underline"
              >
                See all {total} results for “{text.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

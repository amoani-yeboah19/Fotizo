import { SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Category } from "@/types";

interface FilterSidebarProps {
  categories: Category[];
  showCount?: boolean;
  rangeLabel: string;
  rangeDefault: [number, number];
  rangeMax: number;
  rangeStep: number;
  rangeMinLabel: string;
  rangeMaxLabel: string;
  showInStock?: boolean;
}

// Shared filter sidebar for the product and service listings (differences are props).
export function FilterSidebar({
  categories,
  showCount = false,
  rangeLabel,
  rangeDefault,
  rangeMax,
  rangeStep,
  rangeMinLabel,
  rangeMaxLabel,
  showInStock = false,
}: FilterSidebarProps) {
  return (
    <aside className="w-full md:w-64 shrink-0 space-y-8">
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" /> Filters
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              Category
            </h4>
            <div className="space-y-2.5">
              {categories.slice(0, 5).map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{c.name}</span>
                  {showCount && (
                    <span className="text-xs text-muted-foreground ml-auto">({c.count})</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">
              {rangeLabel}
            </h4>
            <Slider defaultValue={rangeDefault} max={rangeMax} step={rangeStep} className="mb-4" />
            <div className="flex items-center justify-between text-sm">
              <span>{rangeMinLabel}</span>
              <span>{rangeMaxLabel}</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              Rating
            </h4>
            <div className="space-y-2.5">
              {[4, 3, 2].map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    className="border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{r} Stars &amp; Up</span>
                </label>
              ))}
            </div>
          </div>

          {showInStock && (
            <>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <Label htmlFor="in-stock" className="text-sm font-medium">
                  In Stock Only
                </Label>
                <Switch id="in-stock" />
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

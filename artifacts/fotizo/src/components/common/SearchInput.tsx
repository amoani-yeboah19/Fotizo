import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

// Search box with a leading icon. Used in the navbar and the product/service listings.
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-4 py-2.5 rounded-full text-sm outline-none transition-all",
          inputClassName,
        )}
      />
    </div>
  );
}

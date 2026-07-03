import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductsMegaMenu() {
  return (
    <div className="relative group">
      <Link href="/products">
        <span className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors py-8 cursor-pointer">
          Products <ChevronDown className="w-4 h-4" />
        </span>
      </Link>
      {/* Mega menu */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-6 grid grid-cols-3 gap-6">
        <div>
          <h3 className="font-semibold text-primary mb-3">Popular</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/products?category=Electronics" className="hover:text-primary">Electronics</Link></li>
            <li><Link href="/products?category=Fashion" className="hover:text-primary">Fashion & Apparel</Link></li>
            <li><Link href="/products?category=Home" className="hover:text-primary">Home & Garden</Link></li>
            <li><Link href="/products?category=Sports" className="hover:text-primary">Sports & Outdoors</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-primary mb-3">Trending</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/products" className="hover:text-primary">Smart Home</Link></li>
            <li><Link href="/products" className="hover:text-primary">Wearables</Link></li>
            <li><Link href="/products" className="hover:text-primary">Sneakers</Link></li>
            <li><Link href="/products" className="hover:text-primary">Minimalist Decor</Link></li>
          </ul>
        </div>
        <div className="bg-muted rounded-lg p-4 flex flex-col items-start justify-center">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Featured</span>
          <p className="text-sm font-medium mb-3">Discover the new summer collection.</p>
          <Link href="/products">
            <Button variant="link" className="p-0 h-auto text-primary">Shop now &rarr;</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

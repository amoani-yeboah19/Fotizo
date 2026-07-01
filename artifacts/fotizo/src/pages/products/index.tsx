import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { products, categories } from "@/data/mockData";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  
  // Note: Simple display of all 8 items, but we implement the UI for filtering
  const displayedProducts = products;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-24 md:py-32">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0 space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" /> Filters
              </h3>
              
              <div className="space-y-6">
                {/* Categories */}
                <div>
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">Category</h4>
                  <div className="space-y-2.5">
                    {categories.slice(0, 5).map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                        <span className="text-sm">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">({c.count})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Price Range */}
                <div>
                  <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">Price Range</h4>
                  <Slider defaultValue={[50, 1000]} max={2000} step={10} className="mb-4" />
                  <div className="flex items-center justify-between text-sm">
                    <span>£50</span>
                    <span>£1000+</span>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Rating */}
                <div>
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">Rating</h4>
                  <div className="space-y-2.5">
                    {[4, 3, 2].map(r => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="rating" className="border-border text-primary focus:ring-primary" />
                        <span className="text-sm">{r} Stars & Up</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* In Stock */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="in-stock" className="text-sm font-medium">In Stock Only</Label>
                  <Switch id="in-stock" />
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-10 rounded-full bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Showing {displayedProducts.length} products
                </span>
                <select className="border-border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>Relevance</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Top Rated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}

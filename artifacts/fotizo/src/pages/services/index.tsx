import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServiceCard } from "@/components/ServiceCard";
import { services, categories } from "@/data/mockData";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  
  const displayedServices = services;

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
                      </label>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Hourly Rate */}
                <div>
                  <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">Hourly Rate</h4>
                  <Slider defaultValue={[20, 200]} max={500} step={10} className="mb-4" />
                  <div className="flex items-center justify-between text-sm">
                    <span>£20</span>
                    <span>£500+</span>
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

              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search services..." 
                  className="pl-10 rounded-full bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Showing {displayedServices.length} services
                </span>
                <select className="border-border rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>Relevance</option>
                  <option>Highest Rated</option>
                  <option>Newest</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedServices.map(s => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}

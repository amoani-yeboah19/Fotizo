import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, Menu, X, ShoppingCart, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-border/50"
          : "bg-white border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary tracking-tight">
              Fotizo
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors py-8">
                Products <ChevronDown className="w-4 h-4" />
              </button>
              {/* Mega menu placeholder */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-6 grid grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-primary mb-3">Popular</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="hover:text-primary cursor-pointer">Electronics</li>
                    <li className="hover:text-primary cursor-pointer">Fashion & Apparel</li>
                    <li className="hover:text-primary cursor-pointer">Home & Garden</li>
                    <li className="hover:text-primary cursor-pointer">Sports & Outdoors</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-primary mb-3">Trending</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="hover:text-primary cursor-pointer">Smart Home</li>
                    <li className="hover:text-primary cursor-pointer">Wearables</li>
                    <li className="hover:text-primary cursor-pointer">Sneakers</li>
                    <li className="hover:text-primary cursor-pointer">Minimalist Decor</li>
                  </ul>
                </div>
                <div className="bg-muted rounded-lg p-4 flex flex-col items-start justify-center">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Featured</span>
                  <p className="text-sm font-medium mb-3">Discover the new summer collection.</p>
                  <Button variant="link" className="p-0 h-auto text-primary">Shop now &rarr;</Button>
                </div>
              </div>
            </div>
            <Link href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Services
            </Link>
            <Link href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Sellers
            </Link>
            <Link href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              For Business
            </Link>
          </nav>

          {/* Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products, services, professionals..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-transparent focus:bg-white focus:border-primary/30 rounded-full text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="text-sm font-medium">
              Sign In
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
              Get Started
            </Button>
            <button className="relative p-2 text-foreground hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </button>
          </div>

          {/* Mobile Toggle */}
          <div className="flex md:hidden items-center gap-4">
            <button className="relative p-2 text-foreground hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground hover:text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white absolute top-full left-0 w-full p-4 flex flex-col gap-4 shadow-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-3 bg-muted border border-transparent rounded-lg text-sm outline-none"
            />
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="#" className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg">Products</Link>
            <Link href="#" className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg">Services</Link>
            <Link href="#" className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg">Sellers</Link>
            <Link href="#" className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg">For Business</Link>
          </nav>
          <div className="h-px bg-border my-2" />
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full justify-center">Sign In</Button>
            <Button className="w-full justify-center bg-primary text-white">Get Started</Button>
          </div>
        </div>
      )}
    </header>
  );
}

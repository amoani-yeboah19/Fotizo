import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, Menu, X, ShoppingCart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useMessages } from "@/contexts/MessagesContext";
import { ProductsMegaMenu } from "@/components/layout/navbar/ProductsMegaMenu";
import { UserMenu } from "@/components/layout/navbar/UserMenu";
import { NavbarMobileMenu } from "@/components/layout/navbar/NavbarMobileMenu";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { count } = useCart();
  const { totalUnread } = useMessages();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-border/50"
          : "bg-white border-b border-transparent"
      }`}
    >
      <div className="container-app">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              loading="eager"
              decoding="async"
              src="/fotizo-logo.webp"
              alt="Fotizo"
              className="h-6 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <ProductsMegaMenu />
            <Link href="/services">
              <span className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer">
                Services
              </span>
            </Link>
          </nav>

          {/* Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
            <div className="relative w-full">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products, services..."
                aria-label="Search products and services"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-transparent focus:bg-white focus:border-primary/30 rounded-full text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link href="/messages">
                  <button aria-label="Messages" className="relative p-2 text-foreground hover:text-primary transition-colors cursor-pointer">
                    <MessageSquare className="w-5 h-5" />
                    {totalUnread > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalUnread}
                      </span>
                    )}
                  </button>
                </Link>
                <Link href="/cart">
                  <button aria-label="Cart" className="relative p-2 text-foreground hover:text-primary transition-colors cursor-pointer">
                    <ShoppingCart className="w-5 h-5" />
                    {count > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </button>
                </Link>
                <UserMenu />
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-sm font-medium">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="flex md:hidden items-center gap-4">
            <Link href="/cart">
              <button aria-label="Cart" className="relative p-2 text-foreground hover:text-primary transition-colors cursor-pointer">
                <ShoppingCart className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="p-2 text-foreground hover:text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && <NavbarMobileMenu />}
    </header>
  );
}

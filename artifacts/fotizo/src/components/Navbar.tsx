import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, ShoppingCart, ChevronDown, Bell, MessageSquare, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useMessages } from "@/context/MessagesContext";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/context/CurrencyContext";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { user, isAuthenticated, logout } = useAuth();
  const { count } = useCart();
  const { totalUnread } = useMessages();
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    return `/dashboard/${user.role}`;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-border/50"
          : "bg-white border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/fotizo-logo.jpg"
              alt="Fotizo"
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
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
            <Link href="/services">
              <span className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer">
                Services
              </span>
            </Link>
            <Link href="/sellers">
              <span className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer">
                Sellers
              </span>
            </Link>
          </nav>

          {/* Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products, services..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-transparent focus:bg-white focus:border-primary/30 rounded-full text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Currency Switcher */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors py-2">
                {currency.flag} {currency.code} <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full right-0 w-32 bg-white border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code as CurrencyCode)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted ${currency.code === c.code ? 'font-bold text-primary' : 'text-foreground'}`}
                  >
                    {c.flag} {c.code}
                  </button>
                ))}
              </div>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link href="/messages">
                  <button className="relative p-2 text-foreground hover:text-primary transition-colors cursor-pointer">
                    <MessageSquare className="w-5 h-5" />
                    {totalUnread > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalUnread}
                      </span>
                    )}
                  </button>
                </Link>
                <Link href="/cart">
                  <button className="relative p-2 text-foreground hover:text-primary transition-colors cursor-pointer">
                    <ShoppingCart className="w-5 h-5" />
                    {count > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </button>
                </Link>
                <div className="relative group ml-2">
                  <button className="flex items-center gap-2 focus:outline-none">
                    <img src={user?.avatar || "/images/avatar-1.png"} alt={user?.name} className="w-8 h-8 rounded-full border border-border object-cover" />
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 flex flex-col">
                    <div className="px-4 py-2 border-b border-border mb-2">
                      <p className="text-sm font-semibold truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                    <Link href={getDashboardLink()}>
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </button>
                    </Link>
                    <Link href="/messages">
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Messages
                      </button>
                    </Link>
                    <div className="h-px bg-border my-2" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
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
              <button className="relative p-2 text-foreground hover:text-primary transition-colors cursor-pointer">
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
              className="p-2 text-foreground hover:text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white absolute top-full left-0 w-full p-4 flex flex-col gap-4 shadow-lg h-[calc(100vh-80px)] overflow-y-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-3 bg-muted border border-transparent rounded-lg text-sm outline-none"
            />
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="/products"><span className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer">Products</span></Link>
            <Link href="/services"><span className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer">Services</span></Link>
            <Link href="/sellers"><span className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer">Sellers</span></Link>
          </nav>
          <div className="h-px bg-border my-2" />
          
          {isAuthenticated ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <img src={user?.avatar || "/images/avatar-1.png"} alt={user?.name} className="w-10 h-10 rounded-full border border-border object-cover" />
                <div>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
              <Link href={getDashboardLink()}><span className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer">Dashboard</span></Link>
              <Link href="/messages">
                <span className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg cursor-pointer flex justify-between">
                  Messages {totalUnread > 0 && <span className="bg-accent text-white px-2 py-0.5 rounded-full text-xs">{totalUnread}</span>}
                </span>
              </Link>
              <button onClick={handleLogout} className="text-left px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg">Sign Out</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-auto">
              <Link href="/login"><Button variant="outline" className="w-full justify-center">Sign In</Button></Link>
              <Link href="/signup"><Button className="w-full justify-center bg-primary text-white">Get Started</Button></Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

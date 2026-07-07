import { useRef, useState, useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ClipboardList, UserRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Categories } from "@/features/home/components/Categories";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { ServiceCard } from "@/features/artisans/components/ServiceCard";
import { useProducts } from "@/features/marketplace/hooks";
import { useServices } from "@/features/artisans/hooks";
import { useAuth } from "@/contexts/AuthContext";

// One of the two Fiverr-style action cards under the greeting.
function ActionCard({
  icon,
  label,
  title,
  sub,
  cta,
  href,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
      <div className="flex items-start gap-4 min-w-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 font-bold text-foreground leading-tight">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
        </div>
      </div>
      <Link href={href} className="shrink-0 self-start sm:self-center">
        <Button variant="outline" className="rounded-lg font-semibold">{cta}</Button>
      </Link>
    </div>
  );
}

// The signed-in home: Fiverr-style greeting, action cards, and a scrollable
// recommendations row — shown at "/" instead of the marketing landing page.
export function PersonalizedHome() {
  const { user } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: services = [] } = useServices();

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const dashboardHref = user ? `/dashboard/${user.role}` : "/dashboard/buyer";

  const recommended = products.slice(0, 10);
  const topServices = [...services].sort((a, b) => b.rating - a.rating).slice(0, 6);

  // Horizontal recommendations track with arrow controls.
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const check = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => el.removeEventListener("scroll", check);
  }, [recommended.length]);

  const scroll = (dir: "left" | "right") =>
    trackRef.current?.scrollBy({ left: (dir === "right" ? 1 : -1) * 580, behavior: "smooth" });

  const arrowBtn =
    "w-9 h-9 rounded-full border border-border bg-white flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <>
      {/* ── Greeting on a soft brand wash ── */}
      <section className="bg-gradient-to-b from-[#FFF3EA] via-white to-white">
        <div className="container-app pt-28 lg:pt-32 pb-4">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground"
          >
            Welcome back, {firstName}
          </motion.h1>

          {/* Action cards */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-7 grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <ActionCard
              icon={<ClipboardList className="w-5 h-5" aria-hidden="true" />}
              label="Recommended for you"
              title="Tell us what you need"
              sub="Browse services and get tailored offers."
              cta="Get started"
              href="/services"
            />
            <ActionCard
              icon={<UserRound className="w-5 h-5" aria-hidden="true" />}
              label="Profile"
              title="Complete your profile"
              sub="Add details to get tailored suggestions."
              cta="Complete info"
              href={dashboardHref}
            />
          </motion.div>
        </div>
      </section>

      {/* ── Recommendations carousel ── */}
      <section className="py-12 bg-background overflow-hidden">
        <div className="container-app">
          <div className="flex items-end justify-between mb-8">
            <h2 className="heading-section">Based on what you might be looking for</h2>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button aria-label="Scroll recommendations left" onClick={() => scroll("left")} disabled={!canLeft} className={arrowBtn}>
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button aria-label="Scroll recommendations right" onClick={() => scroll("right")} disabled={!canRight} className={arrowBtn}>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto scroll-smooth pb-4 px-4 lg:px-8 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {recommended.map((p) => (
            <div key={p.id} className="w-[270px] shrink-0 snap-start">
              <ProductCard product={p} />
            </div>
          ))}
          <div className="shrink-0 w-4" />
        </div>
      </section>

      {/* ── Services you may like ── */}
      <section className="py-12 bg-muted/30">
        <div className="container-app">
          <SectionHeader
            title="Services you may like"
            subtitle="Hire trusted professionals."
            action={
              <Link href="/services" className="hidden md:flex items-center text-primary font-medium hover:underline">
                View all <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Explore categories ── */}
      <Categories />
    </>
  );
}

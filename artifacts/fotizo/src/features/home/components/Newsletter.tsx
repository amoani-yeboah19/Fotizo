import { ArrowUpRight, ShoppingBag, Store } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

export function Newsletter() {
  const { user } = useAuth();
  const openAuth = useAuthModal();
  const [, navigate] = useLocation();
  return (
    <section
      className="bg-white py-16 sm:py-24"
      aria-labelledby="join-fotizo-heading"
    >
      <div className="container-app">
        <div className="relative overflow-hidden rounded-3xl bg-[#08275B] px-7 py-12 text-white sm:p-14 lg:p-16">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[48px] border-white/5"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                Your next opportunity starts here
              </p>
              <h2
                id="join-fotizo-heading"
                className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl"
              >
                Great finds. New customers.
                <br />
                <span className="text-orange-300">One marketplace.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75">
                Buy what you love. Sell what you do best. Make your next
                connection on Fotizo.
              </p>
              <div className="mt-7 flex flex-wrap gap-5 text-sm text-white/80">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Discover products
                </span>
                <span className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Grow your business
                </span>
              </div>
            </div>
            <Button
              onClick={() =>
                user
                  ? navigate(`/dashboard/${user.role}`)
                  : openAuth("join", "/dashboard")
              }
              className="h-14 gap-3 rounded-full bg-white px-8 text-base font-semibold text-[#08275B] hover:bg-orange-100"
            >
              Join Fotizo{" "}
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

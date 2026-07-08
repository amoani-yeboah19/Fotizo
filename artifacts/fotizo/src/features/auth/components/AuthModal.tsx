import { useState, useEffect, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type AuthView = "signin" | "join";

const PERKS = [
  "Verified sellers & trusted professionals",
  "Quality products and work, done right",
  "Buyers & talent across Ghana, the UK & the USA",
];

// Fiverr-style auth modal: navy brand panel on the left, email sign-in/join
// form on the right, wired to the real auth backend.
export function AuthModal({
  open,
  initialView,
  onOpenChange,
}: {
  open: boolean;
  initialView: AuthView;
  onOpenChange: (open: boolean) => void;
}) {
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [view, setView] = useState<AuthView>(initialView);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

  // Re-sync when the modal is (re)opened from a specific trigger.
  useEffect(() => {
    if (open) {
      setView(initialView);
      setLoading(false);
      setPassword("");
    }
  }, [open, initialView]);

  const isJoin = view === "join";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = isJoin
        ? await signup({ name, email, password, role })
        : await login(email, password);
      if (res.success) {
        toast({
          title: isJoin ? "Welcome to Fotizo!" : "Welcome back!",
          description: isJoin ? "Your account is ready." : "You have successfully signed in.",
        });
        onOpenChange(false);
        setLocation("/");
      } else {
        toast({ variant: "destructive", title: isJoin ? "Sign up failed" : "Sign in failed", description: res.error || "Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[880px] max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0">
        <div className="grid md:grid-cols-2">
          {/* ── Left: brand panel ── */}
          <div className="hidden md:flex flex-col bg-[#08275B] text-white p-10 pb-0">
            <h2 className="text-3xl font-extrabold tracking-tight">Success starts here</h2>
            <ul className="mt-6 space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/90">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#FF6A00]" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-auto -mx-10">
              <img
                src="/images/auth-panel.webp"
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-64 object-cover object-center"
              />
            </div>
          </div>

          {/* ── Right: auth options ── */}
          <div className="flex flex-col p-8 sm:p-10 min-h-[480px]">
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
              {isJoin ? "Create a new account" : "Sign in to your account"}
            </DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {isJoin ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() => setView(isJoin ? "signin" : "join")}
                className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {isJoin ? "Sign in" : "Join here"}
              </button>
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
                {isJoin && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-name">Full name</Label>
                      <Input id="auth-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>I want to</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { id: "buyer", label: "Buy & hire" },
                          { id: "seller", label: "Sell & offer services" },
                        ] as const).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRole(r.id)}
                            aria-pressed={role === r.id}
                            className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                              role === r.id
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input id="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    required
                    minLength={isJoin ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isJoin ? "At least 8 characters" : "Your password"}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 gap-2 font-semibold">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {loading ? "Please wait…" : isJoin ? "Create account" : "Sign in"}
                </Button>
            </form>

            <p className="mt-auto pt-8 text-xs text-muted-foreground leading-relaxed">
              By joining, you agree to the Fotizo{" "}
              <a href="#" className="underline underline-offset-2 hover:text-foreground">Terms of Service</a> and{" "}
              <a href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

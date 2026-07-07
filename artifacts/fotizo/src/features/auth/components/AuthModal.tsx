import { useState, useEffect, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Check, Mail, ArrowLeft, Loader2 } from "lucide-react";
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

// Inline Google "G" — lucide has no branded Google icon.
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
    </svg>
  );
}

// Official Apple mark (Simple Icons path).
function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

// Official Facebook "f" roundel (Simple Icons path).
function FacebookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const providerBtn =
  "w-full h-11 justify-center gap-3 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-muted transition-colors";

// Fiverr-style auth modal: navy brand panel on the left, sign-in/join options on
// the right. Social providers are placeholders until OAuth lands; email works
// against the real auth backend.
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
  const [emailMode, setEmailMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

  // Re-sync when the modal is (re)opened from a specific trigger.
  useEffect(() => {
    if (open) {
      setView(initialView);
      setEmailMode(false);
      setLoading(false);
      setPassword("");
    }
  }, [open, initialView]);

  const isJoin = view === "join";

  const notYet = () =>
    toast({ title: "Coming soon", description: "Social sign-in is on the way — use email for now." });

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
                onClick={() => {
                  setView(isJoin ? "signin" : "join");
                  setEmailMode(false);
                }}
                className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {isJoin ? "Sign in" : "Join here"}
              </button>
            </p>

            {!emailMode ? (
              <div className="mt-7 space-y-3">
                {/* the flow that works today goes first, as the primary action */}
                <button
                  type="button"
                  onClick={() => setEmailMode(true)}
                  className="inline-flex w-full h-11 items-center justify-center gap-3 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Continue with email
                </button>

                <div className="flex items-center gap-3 py-2" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">OR</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <button type="button" onClick={notYet} className={`${providerBtn} inline-flex items-center`}>
                  <GoogleIcon />
                  Continue with Google
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={notYet} className={`${providerBtn} inline-flex items-center`}>
                    <AppleIcon />
                    Apple
                  </button>
                  <button type="button" onClick={notYet} className={`${providerBtn} inline-flex items-center`}>
                    <FacebookIcon />
                    Facebook
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <button
                  type="button"
                  onClick={() => setEmailMode(false)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
                </button>

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
            )}

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

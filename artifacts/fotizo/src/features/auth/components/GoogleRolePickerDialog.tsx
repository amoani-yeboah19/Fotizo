import { ProfileFields } from "@/features/settings/components/ProfileFields";
import {
  emptyProfile,
  validateProfile,
  saveProfileDraft,
} from "@/features/settings/profile";
import { useState, useEffect, type FormEvent } from "react";
import { ShoppingBag, Store, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  {
    id: "buyer",
    label: "Buyer",
    desc: "Buy Products & Hire Professionals",
    icon: ShoppingBag,
  },
  {
    id: "seller",
    label: "Professional",
    desc: "Sell Products or Offer Services",
    icon: Store,
  },
] as const;

interface GoogleRolePickerDialogProps {
  // Presence of a pending token is what opens the dialog.
  pendingToken: string | null;
  onClose: () => void;
  onComplete: (role: "buyer" | "seller") => void;
}

// Shown once, right after Google verifies a brand-new user's identity — no
// account exists yet until they pick buyer/seller here.
export function GoogleRolePickerDialog({
  pendingToken,
  onClose,
  onComplete,
}: GoogleRolePickerDialogProps) {
  const { completeGoogleSignup } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ ...emptyProfile });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setStep(0);
    setDetails({ ...emptyProfile });
    setAccepted(false);
    setError("");
    setRole("buyer");
  }, [pendingToken]);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingToken || isLoading) return;
    setError("");
    if (step === 0) {
      setStep(1);
      return;
    }
    const invalid = validateProfile(details, role);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!accepted) {
      setError("Accept the Terms of Service to continue.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await completeGoogleSignup(pendingToken, role);
      if (res.success) {
        const saved = res.user && saveProfileDraft(res.user.id, details);
        toast({
          title: saved ? "Profile draft saved" : "Profile draft not saved",
          description: saved
            ? "Your additional details are saved on this browser only."
            : "You can add your professional details in Account settings.",
        });
        onComplete(role);
      } else {
        toast({
          variant: "destructive",
          title: "Couldn't finish creating your account",
          description: res.error,
        });
      }
    } catch {
      setError("We could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={!!pendingToken}
      onOpenChange={(open) => !open && !isLoading && onClose()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === 0 ? "Choose your account" : "Complete your profile"}
          </DialogTitle>
          <DialogDescription>
            Tell us how you'll be using Fotizo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-5">
          <fieldset disabled={isLoading} className="space-y-5 min-w-0">
            {step === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                {ROLES.map((r) => (
                  <button
                    type="button"
                    aria-pressed={role === r.id}
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${
                      role === r.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg mr-4 ${
                        role === r.id
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <r.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {r.label}
                      </h4>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  Profile preview · These additional details are saved as a
                  browser draft until account syncing is available.
                </p>
                <ProfileFields
                  prefix="google-join"
                  value={details}
                  onChange={setDetails}
                  role={role}
                />
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    required
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and acknowledge the{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {step === 0 ? "Continue to profile" : "Create account"}
            </Button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

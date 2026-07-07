import { useState } from "react";
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
  { id: "buyer", label: "Buyer", desc: "Buy Products & Hire Professionals", icon: ShoppingBag },
  { id: "seller", label: "Professional", desc: "Sell Products or Offer Services", icon: Store },
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
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!pendingToken) return;
    setIsLoading(true);
    try {
      const res = await completeGoogleSignup(pendingToken, role);
      if (res.success) {
        onComplete(role);
      } else {
        toast({
          variant: "destructive",
          title: "Couldn't finish creating your account",
          description: res.error,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!pendingToken} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>One more step</DialogTitle>
          <DialogDescription>Tell us how you'll be using Fotizo.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {ROLES.map((r) => (
            <div
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${
                role === r.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <div
                className={`p-3 rounded-lg mr-4 ${
                  role === r.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                <r.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{r.label}</h4>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-white"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}

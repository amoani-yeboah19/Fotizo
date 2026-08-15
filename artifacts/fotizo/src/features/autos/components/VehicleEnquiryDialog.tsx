import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { submitVehicleEnquiry } from "@/features/autos/services/autos.service";
import { leadTimeLabel, vehicleName, type Vehicle } from "@/features/autos/data/vehicles";

// A vehicle enquiry is a sales lead, not an order — no cart, no payment. The
// sales team picks it up, confirms duty and spec, and quotes a binding figure.
export function VehicleEnquiryDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await submitVehicleEnquiry({
        vehicleId: vehicle.id,
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        destination: String(form.get("destination") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
      });
      setSubmitted(true);
    } catch {
      setError("We couldn't send that just now. Please try again, or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset back to the form when the dialog is dismissed, so reopening it after a
  // successful send doesn't strand the user on the confirmation panel.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSubmitted(false);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {submitted ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
            <DialogTitle className="mt-4 text-lg">Enquiry sent</DialogTitle>
            <DialogDescription className="mt-2">
              Thanks — our team will come back to you within one working day with a firm quote for
              the {vehicleName(vehicle)}, including freight and the duty for your country.
            </DialogDescription>
            <Button className="mt-6 w-full" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Enquire about the {vehicleName(vehicle)}</DialogTitle>
              <DialogDescription>
                Tell us where it's going and how to reach you, and we'll confirm the landed price
                for your country, available colours and the current lead time ({leadTimeLabel(vehicle)}).
                No payment is taken at this stage.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="enquiry-name">Full name</Label>
                <Input id="enquiry-name" name="name" required defaultValue={user?.name ?? ""} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="enquiry-phone">Phone</Label>
                  <Input
                    id="enquiry-phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="0244 000 000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="enquiry-email">Email</Label>
                  <Input
                    id="enquiry-email"
                    name="email"
                    type="email"
                    required
                    defaultValue={user?.email ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="enquiry-destination">Delivering to which country?</Label>
                <Input
                  id="enquiry-destination"
                  name="destination"
                  required
                  placeholder="e.g. Ghana, Nigeria, UK"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="enquiry-message">Anything specific? (optional)</Label>
                <Textarea
                  id="enquiry-message"
                  name="message"
                  rows={3}
                  placeholder="Preferred colour, trim level, financing, trade-in…"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send enquiry"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

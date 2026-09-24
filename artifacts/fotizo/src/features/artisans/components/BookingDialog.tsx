import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Price } from "@/components/common/Price";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { apiErrorMessage } from "@/api";
import { useRequestBooking } from "@/features/bookings/hooks";

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// "Book Now" for a single service package: sends a booking request that the
// provider confirms or declines. Payment is arranged with the provider.
export function BookingDialog({
  serviceId,
  providerName,
  packageName,
  packagePrice,
}: {
  serviceId: string;
  providerName: string;
  packageName: string;
  packagePrice: number;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const openAuth = useAuthModal();
  const [location] = useLocation();
  const request = useRequestBooking();

  const start = () => {
    if (!user) {
      toast({ title: "Sign in to book", description: "Please sign in to request a booking." });
      openAuth("signin", location);
      return;
    }
    setOpen(true);
  };

  const handleBook = async () => {
    if (!date || !time) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select a date and time for your booking.",
      });
      return;
    }
    // The chosen date and time are the customer's local time.
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      toast({ variant: "destructive", title: "Choose a future time", description: "That date and time has passed." });
      return;
    }
    try {
      const booking = await request.mutateAsync({
        serviceId,
        packageName,
        scheduledFor: when.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: message.trim(),
      });
      toast({
        title: "Booking requested",
        description: `${booking.reference}: ${providerName} will confirm or decline. Track it in your dashboard.`,
      });
      setOpen(false);
      setDate("");
      setTime("");
      setMessage("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Booking not sent",
        description: apiErrorMessage(error, "Please try again."),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="w-full" onClick={start}>Book Now</Button>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book {providerName}</DialogTitle>
          <DialogDescription>
            Package: {packageName} (<Price amount={packagePrice} />)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" min={localDate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Tell the provider what you need help with..."
              value={message}
              maxLength={2000}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleBook} disabled={request.isPending}>Request Booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

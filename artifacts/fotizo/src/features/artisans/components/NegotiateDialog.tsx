import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { Handshake } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useToast } from "@/hooks/use-toast";

interface NegotiableService {
  id: string;
  title: string;
  provider: string;
  providerId: string;
  avatar: string;
  hourlyRate: number;
}

// "Negotiate" button + popup shown on service cards. Sends the professional a
// Fiverr-style offer card in a message thread.
export function NegotiateDialog({
  service,
  billingMode = "hourly",
}: {
  service: NegotiableService;
  billingMode?: "hourly" | "contract";
}) {
  const { user } = useAuth();
  const { startConversation, sendOffer } = useMessages();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const openAuth = useAuthModal();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("1");
  const [mode, setMode] = useState(billingMode);
  const [sending, setSending] = useState(false);

  const units = Number(duration);
  const rate = Number(amount);
  const total =
    Math.round((mode === "hourly" ? rate * units : rate) * 100) / 100;
  const valid =
    description.trim().length > 0 &&
    Number.isInteger(units) &&
    units >= 1 &&
    units <= 365 &&
    Number.isFinite(rate) &&
    rate > 0 &&
    total <= 99999999.99;

  const submit = async () => {
    if (!user) {
      toast({
        title: "Sign in to negotiate",
        description: "Please log in to send an offer.",
      });
      setOpen(false);
      openAuth("signin", location);
      return;
    }
    if (!valid || sending) return;
    setSending(true);
    try {
      const convId = await startConversation(
        {
          id: service.providerId,
          name: service.provider,
          avatar: service.avatar,
          role: "seller",
        },
        `Negotiation: ${service.title}`,
      );
      const terms =
        mode === "hourly"
          ? `Hourly work: ${units} hour(s) at GBP ${rate.toFixed(2)}/hour. Total budget GBP ${total.toFixed(2)}.`
          : `Fixed-price contract: ${units} day(s). Total contract budget GBP ${total.toFixed(2)}.`;
      await sendOffer(
        convId,
        { description: `${terms}\n${description.trim()}`, amount: total },
        user.id,
        user.name,
      );
      toast({
        title: "Offer sent",
        description: `Your offer was sent to ${service.provider}.`,
      });
      setDescription("");
      setAmount("");
      setOpen(false);
      setLocation(`/messages/${convId}`);
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't send offer",
        description: "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setMode(billingMode);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={(e) => e.stopPropagation()}
          className="gap-1.5 rounded-full border-[#FF6A00]/30 text-[#FF6A00] hover:bg-[#FF6A00]/5"
        >
          <Handshake className="w-4 h-4" aria-hidden="true" /> Negotiate
        </Button>
      </DialogTrigger>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="w-[calc(100%-2rem)] max-h-[92vh] overflow-y-auto rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle>Send an offer to {service.provider}</DialogTitle>
          <DialogDescription>
            Tell them what you need and your proposed budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="work-arrangement">Work arrangement</Label>
            <select
              id="work-arrangement"
              value={mode}
              onChange={(e) => setMode(e.target.value as "hourly" | "contract")}
              className="w-full rounded-md border border-border bg-background p-2"
            >
              <option value="hourly">Hourly work</option>
              <option value="contract">Fixed-price contract</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-duration">
              {mode === "hourly"
                ? "Number of hours"
                : "Contract duration (days)"}
            </Label>
            <Input
              id="work-duration"
              type="number"
              min="1"
              max="365"
              step="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="negotiate-desc">
              What would you like to negotiate?
            </Label>
            <Textarea
              id="negotiate-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. I need a full brand kit (logo, colours, typography) delivered within 5 days."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Press Enter to send · Shift+Enter for a new line
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="negotiate-amount">
              {mode === "hourly"
                ? "Proposed hourly rate (£)"
                : "Total contract budget (£)"}
            </Label>
            <Input
              id="negotiate-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(service.hourlyRate)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {valid ? `Total offer: £${total.toFixed(2)}. ` : ""}The provider must
          agree to the duration, scope and price.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!valid || sending}
            className="gap-1.5"
          >
            <Handshake className="w-4 h-4" aria-hidden="true" />{" "}
            {sending ? "Sending…" : "Send offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

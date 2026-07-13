import { useState } from "react";
import { useLocation } from "wouter";
import { Handshake } from "lucide-react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
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
export function NegotiateDialog({ service }: { service: NegotiableService }) {
  const { user } = useAuth();
  const { startConversation, sendOffer } = useMessages();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const valid = description.trim().length > 0 && Number(amount) > 0;

  const submit = async () => {
    if (!user) {
      toast({ title: "Sign in to negotiate", description: "Please log in to send an offer." });
      setOpen(false);
      setLocation("/login");
      return;
    }
    if (!valid || sending) return;
    setSending(true);
    try {
      const convId = await startConversation(
        { id: service.providerId, name: service.provider, avatar: service.avatar, role: "seller" },
        `Negotiation: ${service.title}`,
      );
      sendOffer(convId, { description: description.trim(), amount: Number(amount) }, user.id, user.name);
      toast({ title: "Offer sent", description: `Your offer was sent to ${service.provider}.` });
      setDescription("");
      setAmount("");
      setOpen(false);
      setLocation(`/messages/${convId}`);
    } catch {
      toast({ variant: "destructive", title: "Couldn't send offer", description: "Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogDescription>Tell them what you need and your proposed budget.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="negotiate-desc">What would you like to negotiate?</Label>
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
            <p className="text-xs text-muted-foreground">Press Enter to send · Shift+Enter for a new line</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="negotiate-amount">Your budget / offer (£)</Label>
            <Input
              id="negotiate-amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(service.hourlyRate)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={!valid || sending} className="gap-1.5">
            <Handshake className="w-4 h-4" aria-hidden="true" /> {sending ? "Sending…" : "Send offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

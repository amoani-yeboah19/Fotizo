import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Globe2, Truck, ShieldCheck, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Shown once per browsing session when a shopper opens the Fotizo Shop, so it's
// clear these items are sourced from our China supplier network rather than
// from the local Ghana marketplace.
const SEEN_KEY = "fotizo_shop_china_notice_seen";

const POINTS = [
  {
    icon: Truck,
    title: "Ships from China",
    body: "Orders are consolidated at our Guangzhou hub and flown or shipped to Accra.",
  },
  {
    icon: Clock,
    title: "7–21 day delivery",
    body: "Air freight lands in about a week; sea freight takes up to three weeks.",
  },
  {
    icon: ShieldCheck,
    title: "Buyer protection",
    body: "Every order is quality-checked before dispatch and covered by a refund guarantee.",
  },
];

export function ChinaMarketDialog() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY) === "1") return;
    setOpen(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="max-w-md overflow-hidden p-0">
        <div className="bg-gradient-to-r from-[#08275B] via-[#0a2f6e] to-[#FF6A00] px-6 py-5 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> Global sourcing
          </span>
          <DialogHeader className="mt-3 space-y-1.5">
            <DialogTitle className="text-xl font-extrabold text-white">
              You're entering the China market
            </DialogTitle>
            <DialogDescription className="text-sm text-white/85">
              Fotizo Shop is stocked by our supplier network in China. These are imports — not items
              held by local sellers on the Fotizo marketplace.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pt-5">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF6A00]/10 text-[#FF6A00]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-sm leading-snug text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 px-6 pb-6 pt-5 sm:justify-end">
          <Button variant="outline" onClick={() => setLocation("/products")}>
            Shop local instead
          </Button>
          <Button className="bg-[#FF6A00] text-white hover:bg-[#FF6A00]/90" onClick={dismiss}>
            Continue to shop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

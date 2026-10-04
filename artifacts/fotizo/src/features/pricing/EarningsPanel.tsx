import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { api, AUTH_USE_MOCKS, apiErrorMessage } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge, type BadgeTone } from "@/components/common/StatusBadge";
import { Loading } from "@/components/common/QueryStates";
import { Button } from "@/components/ui/button";

export interface EarningsReport {
  /** False while fees are recorded but not yet deducted from payouts. */
  collectionActive: boolean;
  totals: { currency: string; gross: number; fees: number; net: number; count: number }[];
  items: {
    id: string;
    kind: "booking" | "unit_sale";
    reference: string;
    title: string;
    quantity: number;
    currency: string;
    gross: number;
    fee: number;
    net: number;
    status: "pending" | "collected" | "waived" | "reversed";
    createdAt: string;
  }[];
}

export const earningsService = {
  get: () => api.get<EarningsReport>("/earnings"),
};

// Fees are fixed amounts in the currency the customer paid, so they're shown
// in that currency — never converted by the display-currency switcher.
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);

const STATUS: Record<EarningsReport["items"][number]["status"], { label: string; tone: BadgeTone }> = {
  pending: { label: "Not yet collected", tone: "warning" },
  collected: { label: "Collected", tone: "success" },
  waived: { label: "Waived", tone: "neutral" },
  reversed: { label: "Reversed", tone: "neutral" },
};

/** A seller's or provider's gross earnings, Fotizo fees and net payout. */
export function EarningsPanel() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["earnings", user?.id],
    queryFn: earningsService.get,
    enabled: !AUTH_USE_MOCKS && Boolean(user),
  });

  if (AUTH_USE_MOCKS) return <p className="text-sm text-muted-foreground">Earnings appear here for live accounts.</p>;
  if (query.isLoading) return <Loading label="Loading your earnings…" />;
  if (query.isError || !query.data)
    return (
      <SurfaceCard className="p-6 space-y-3">
        <p role="alert" className="text-sm text-destructive">{apiErrorMessage(query.error, "We couldn't load your earnings.")}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>Try again</Button>
      </SurfaceCard>
    );

  const { totals, items, collectionActive } = query.data;
  return (
    <div className="space-y-6">
      {!collectionActive && (
        <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Fotizo calculates fees from your paid sales and completed bookings. Collection hasn't started yet, so nothing
          has been deducted — fees show as “Not yet collected”.
        </p>
      )}
      {totals.length === 0 ? (
        <SurfaceCard className="p-10 text-center">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 font-semibold">No earnings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Paid orders and completed bookings will appear here.</p>
        </SurfaceCard>
      ) : (
        <>
          {totals.map((t) => (
            <div key={t.currency} className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label={`Earnings in ${t.currency}`}>
              <SurfaceCard className="p-5">
                <p className="text-sm text-muted-foreground">Gross earnings ({t.currency})</p>
                <p className="mt-1 text-2xl font-bold">{money(t.gross, t.currency)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.count} paid {t.count === 1 ? "sale or booking" : "sales and bookings"}</p>
              </SurfaceCard>
              <SurfaceCard className="p-5">
                <p className="text-sm text-muted-foreground">Fotizo fees</p>
                <p className="mt-1 text-2xl font-bold text-destructive">−{money(t.fees, t.currency)}</p>
              </SurfaceCard>
              <SurfaceCard className="p-5">
                <p className="text-sm text-muted-foreground">Net payout</p>
                <p className="mt-1 text-2xl font-bold text-primary">{money(t.net, t.currency)}</p>
              </SurfaceCard>
            </div>
          ))}
          <SurfaceCard className="overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-bold">Recent fees</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    {["Date", "Item", "Gross", "Fee", "Net", "Status"].map((h) => (
                      <th key={h} className="px-6 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                      <td className="px-6 py-3">
                        <p className="font-medium line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.kind === "booking" ? "Booking" : `Sale × ${item.quantity}`} · {item.reference}
                        </p>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">{money(item.gross, item.currency)}</td>
                      <td className="px-6 py-3 whitespace-nowrap">−{money(item.fee, item.currency)}</td>
                      <td className="px-6 py-3 whitespace-nowrap font-medium">{money(item.net, item.currency)}</td>
                      <td className="px-6 py-3"><StatusBadge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </>
      )}
    </div>
  );
}

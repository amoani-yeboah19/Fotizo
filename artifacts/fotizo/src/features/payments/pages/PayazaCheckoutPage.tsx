import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, apiErrorMessage } from "@/api";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { loadPayaza, type PayazaConfig } from "../services/payaza";
export default function PayazaCheckoutPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const order = params.get("order") ?? "";
  const attempt = params.get("attempt") ?? "";
  const [config, setConfig] = useState<PayazaConfig>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const returnToOrder = () => navigate("/order-confirmation?order=" + encodeURIComponent(order));
  useEffect(() => {
    let active = true;
    api.get<PayazaConfig>("/payments/orders/" + encodeURIComponent(order) + "/checkout/" + encodeURIComponent(attempt))
      .then(value => { if (active) setConfig(value); })
      .catch(e => { if (active) setError(apiErrorMessage(e, "Unable to open payment.")); });
    return () => { active = false; };
  }, [order, attempt]);
  const pay = async () => {
    if (!config || busy) return;
    setBusy(true); setError("");
    try {
      await loadPayaza();
      const checkout = window.PayazaCheckout!.setup(config);
      checkout.setCallback(response => {
        if (response.type === "error") { setError(response.data?.message ?? "Payment could not be completed. Please try again."); setBusy(false); }
        else returnToOrder(); // The order page verifies with the server; callbacks never mark paid.
      });
      checkout.setOnClose(returnToOrder);
      checkout.showPopup();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to open Payaza."); setBusy(false); }
  };
  return <PageLayout mainClassName="container-app py-24"><div className="mx-auto max-w-md space-y-5 rounded-2xl border p-6">
    <h1 className="text-2xl font-bold">Pay securely with Payaza</h1>
    {config ? <p>Total to pay: <strong>{config.currency_code} {config.checkout_amount.toFixed(2)}</strong>. Choose an available payment method in Payaza.</p> : !error && <p>Loading payment…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button onClick={pay} disabled={!config || busy}>{busy ? "Payment in progress…" : "Continue to Payaza"}</Button>
    <Button variant="outline" onClick={returnToOrder}>Back to order</Button>
  </div></PageLayout>;
}

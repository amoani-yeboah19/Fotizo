export type PayazaConfig = { merchant_key: string; connection_mode: "Test" | "Live"; checkout_amount: number; currency_code: string; transaction_reference: string; email_address: string; first_name: string; last_name: string; phone_number: string };
type Checkout = { setCallback(callback: (response: { type?: string; data?: { message?: string } }) => void): void; setOnClose(callback: () => void): void; showPopup(): void };
declare global { interface Window { PayazaCheckout?: { setup(config: PayazaConfig): Checkout } } }
let loading: Promise<void> | undefined;
export function loadPayaza(): Promise<void> {
  if (window.PayazaCheckout) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timeout); script.remove(); loading = undefined; reject(new Error("Payaza checkout could not load. Please try again.")); };
    script.src = "https://checkout-v2.payaza.africa/js/v1/bundle.js";
    script.async = true;
    script.onload = () => { clearTimeout(timeout); if (window.PayazaCheckout) resolve(); else fail(); };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

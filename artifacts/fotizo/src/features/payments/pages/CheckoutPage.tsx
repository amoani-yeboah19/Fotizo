import { useState } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaceOrder } from "@/features/payments/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/api";
import type { DeliveryDetails, PaymentMethod } from "@/types";
import { Loader2, CheckCircle2 } from "lucide-react";

// Same rule the server applies when it prices the order.
const FREE_DELIVERY_OVER = 50;
const DELIVERY_FEE = 5.99;

const COUNTRIES: { value: DeliveryDetails["country"]; label: string }[] = [
  { value: "GH", label: "Ghana" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
];

export const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; detail: string }[] = [
  {
    value: "pay_on_delivery",
    label: "Pay on delivery",
    detail: "Pay in cash or by mobile money when your order arrives.",
  },
  {
    value: "mobile_money",
    label: "Mobile money",
    detail: "We call you to confirm the order and share the mobile money number to pay.",
  },
  {
    value: "bank_transfer",
    label: "Bank transfer",
    detail: "We call you to confirm the order and share bank details for the transfer.",
  },
];

type Field = keyof DeliveryDetails;
const REQUIRED: Field[] = ["name", "email", "phone", "addressLine1", "city"];

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const placeOrder = usePlaceOrder();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryDetails>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    country: "GH",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_on_delivery");
  // One key per checkout: a retried or double-clicked submission returns the
  // order already created instead of placing a second one.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const shipping = total > FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const grandTotal = total + (items.length > 0 ? shipping : 0);
  const payment = PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)!;

  // If cart is empty, user shouldn't be here
  if (items.length === 0 && !isProcessing) {
    setLocation("/cart");
    return null;
  }

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDelivery((d) => ({ ...d, [field]: e.target.value }));

  const continueToPayment = () => {
    const next: Partial<Record<Field, string>> = {};
    for (const field of REQUIRED) if (!delivery[field].trim()) next[field] = "Required";
    if (delivery.email && !/^\S+@\S+\.\S+$/.test(delivery.email.trim())) next.email = "Enter a valid email";
    if (delivery.phone && delivery.phone.trim().length < 5) next.phone = "Enter a valid phone number";
    setErrors(next);
    if (Object.keys(next).length === 0) setStep(2);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      const order = await placeOrder.mutateAsync({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        delivery,
        paymentMethod,
        idempotencyKey,
      });
      clearCart();
      setLocation(`/order-confirmation?order=${order.orderId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't place order",
        description: apiErrorMessage(
          error,
          "We couldn't reach the server. Your order was not placed; please try again.",
        ),
      });
      setIsProcessing(false);
    }
  };

  const fieldError = (field: Field) =>
    errors[field] ? <p className="text-sm text-destructive">{errors[field]}</p> : null;
  const invalid = (field: Field) => (errors[field] ? "border-destructive" : "");

  return (
    <PageLayout mainClassName="container-app py-24">
        <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto">

          <div className="flex-1 space-y-8">
            {/* Step 1: Delivery Details */}
            <div className={`bg-white rounded-2xl border ${step === 1 ? 'border-primary ring-1 ring-primary/20' : 'border-border'} p-6 transition-all`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 1 ? 'bg-primary text-white' : step > 1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                  </span>
                  Delivery Details
                </h2>
                {step > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Edit</Button>
                )}
              </div>

              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="checkout-name">Full Name</Label>
                    <Input id="checkout-name" placeholder="Ama Mensah" value={delivery.name} onChange={set("name")} className={invalid("name")} autoComplete="name" />
                    {fieldError("name")}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-email">Email</Label>
                      <Input id="checkout-email" type="email" placeholder="ama@example.com" value={delivery.email} onChange={set("email")} className={invalid("email")} autoComplete="email" />
                      {fieldError("email")}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-phone">Phone</Label>
                      <Input id="checkout-phone" type="tel" placeholder="0244 000 000" value={delivery.phone} onChange={set("phone")} className={invalid("phone")} autoComplete="tel" />
                      {fieldError("phone")}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-address1">Address Line 1</Label>
                    <Input id="checkout-address1" placeholder="12 Ring Road" value={delivery.addressLine1} onChange={set("addressLine1")} className={invalid("addressLine1")} autoComplete="address-line1" />
                    {fieldError("addressLine1")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-address2">Address Line 2 (Optional)</Label>
                    <Input id="checkout-address2" placeholder="Apt 4B" value={delivery.addressLine2} onChange={set("addressLine2")} autoComplete="address-line2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-city">City</Label>
                      <Input id="checkout-city" placeholder="Accra" value={delivery.city} onChange={set("city")} className={invalid("city")} autoComplete="address-level2" />
                      {fieldError("city")}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-postcode">Postcode / Zip (Optional)</Label>
                      <Input id="checkout-postcode" placeholder="GA-123-4567" value={delivery.postalCode} onChange={set("postalCode")} autoComplete="postal-code" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-country">Country</Label>
                    <select id="checkout-country" value={delivery.country} onChange={set("country")} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      {COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-4">
                    <Button onClick={continueToPayment} className="w-full sm:w-auto">Continue to Payment</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Payment */}
            <div className={`bg-white rounded-2xl border ${step === 2 ? 'border-primary ring-1 ring-primary/20' : 'border-border'} p-6 transition-all opacity-${step >= 2 ? '100' : '50'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                  </span>
                  Payment
                </h2>
                {step > 2 && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Edit</Button>
                )}
              </div>

              {step === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <fieldset className="space-y-3">
                    <legend className="sr-only">Payment method</legend>
                    {PAYMENT_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${paymentMethod === option.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={option.value}
                          checked={paymentMethod === option.value}
                          onChange={() => setPaymentMethod(option.value)}
                          className="mt-1 border-border text-primary focus:ring-primary"
                        />
                        <span>
                          <span className="block font-semibold text-sm">{option.label}</span>
                          <span className="block text-sm text-muted-foreground">{option.detail}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="text-sm text-muted-foreground">No card details are needed. Nothing is charged online.</p>
                  <div className="pt-4 flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={() => setStep(3)}>Review Order</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Review */}
            <div className={`bg-white rounded-2xl border ${step === 3 ? 'border-primary ring-1 ring-primary/20' : 'border-border'} p-6 transition-all opacity-${step === 3 ? '100' : '50'}`}>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  3
                </span>
                Review Order
              </h2>

              {step === 3 && (
                <div className="animate-in fade-in">
                  <p className="text-muted-foreground mb-6">Please review your items and details before placing the order.</p>

                  <div className="space-y-4 mb-6">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.title}</span>
                        <Price amount={item.price * item.quantity} className="font-medium" />
                      </div>
                    ))}
                  </div>

                  <div className="mb-6 grid gap-4 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="font-semibold mb-1">Deliver to</p>
                      <p className="text-muted-foreground">
                        {delivery.name}<br />
                        {delivery.addressLine1}{delivery.addressLine2 ? `, ${delivery.addressLine2}` : ""}<br />
                        {delivery.city}{delivery.postalCode ? ` ${delivery.postalCode}` : ""}, {COUNTRIES.find((c) => c.value === delivery.country)?.label}<br />
                        {delivery.phone}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Payment</p>
                      <p className="text-muted-foreground">{payment.label}</p>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                    <Button onClick={handlePlaceOrder} className="flex-1" disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      Place Order - <Price amount={grandTotal} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Summary */}
          <div className="w-full lg:w-80 shrink-0">
            <SurfaceCard className="p-6 sticky top-24 shadow-none">
              <h3 className="text-lg font-bold mb-6">Order Summary</h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({items.length} items)</span>
                  <Price amount={total} className="text-foreground font-medium" />
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-foreground font-medium">
                    {shipping === 0 ? "Free" : <Price amount={shipping} />}
                  </span>
                </div>
              </div>

              <div className="h-px bg-border mb-6" />

              <div className="flex justify-between mb-2">
                <span className="text-lg font-bold">Total</span>
                <Price amount={grandTotal} className="text-2xl font-bold text-primary" />
              </div>
            </SurfaceCard>
          </div>

        </div>
    </PageLayout>
  );
}

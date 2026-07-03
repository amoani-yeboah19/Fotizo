import { useState } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/contexts/CartContext";
import { usePlaceOrder } from "@/features/payments/hooks";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, total, clearCart } = useCart();
  const placeOrder = usePlaceOrder();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const shipping = total > 50 ? 0 : 5.99;
  const grandTotal = total + (items.length > 0 ? shipping : 0);

  // If cart is empty, user shouldn't be here
  if (items.length === 0 && !isProcessing) {
    setLocation("/cart");
    return null;
  }

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    await placeOrder.mutateAsync({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      total: grandTotal,
    });
    clearCart();
    setLocation("/order-confirmation");
  };

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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 1</Label>
                    <Input placeholder="123 Main St" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 2 (Optional)</Label>
                    <Input placeholder="Apt 4B" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input placeholder="London" />
                    </div>
                    <div className="space-y-2">
                      <Label>Postcode / Zip</Label>
                      <Input placeholder="SW1A 1AA" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="UK">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                  <div className="pt-4">
                    <Button onClick={() => setStep(2)} className="w-full sm:w-auto">Continue to Payment</Button>
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
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input placeholder="4000 1234 5678 9010" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input placeholder="MM/YY" />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <Input placeholder="123" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="billing" defaultChecked />
                    <Label htmlFor="billing">Billing address is same as delivery</Label>
                  </div>
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

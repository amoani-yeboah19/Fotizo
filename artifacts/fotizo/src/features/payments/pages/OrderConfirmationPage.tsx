import { useState } from "react";
import { Link, useSearch } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { Loading } from "@/components/common/QueryStates";
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useOrderDetail, useVerifyPayment } from "@/features/payments/hooks";
import { PAYMENT_OPTIONS, isOnlinePayment } from "@/features/payments/pages/CheckoutPage";
import { ordersService } from "@/features/payments/services/orders.service";
import { apiErrorMessage } from "@/api";

export default function OrderConfirmation() {
  const orderId = new URLSearchParams(useSearch()).get("order");
  const { data: order, isLoading, isError } = useOrderDetail(orderId);
  // Online orders: confirm with the provider (the redirect back proves nothing).
  const awaitingOnline = Boolean(order && isOnlinePayment(order.paymentMethod) && order.paymentStatus === "unpaid");
  const verification = useVerifyPayment(orderId, awaitingOnline);
  const [opening, setOpening] = useState(false);
  const [payError, setPayError] = useState("");

  const payNow = async () => {
    setOpening(true);
    setPayError("");
    try {
      const { checkoutUrl } = await ordersService.startPayment(orderId!);
      ordersService.openCheckout(checkoutUrl);
    } catch (error) {
      setPayError(apiErrorMessage(error, "We couldn't open the payment page. Please try again."));
      setOpening(false);
    }
  };

  if (isLoading || (awaitingOnline && verification.isLoading)) {
    return (
      <PageLayout mainClassName="container-app py-24">
        <Loading label="Loading your order…" />
      </PageLayout>
    );
  }

  if (!order || isError) {
    return (
      <PageLayout mainClassName="container-app py-24 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-border p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold mb-2">Order not found</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't find that order on your account. Your orders are listed in your dashboard.
          </p>
          <Link href="/dashboard/buyer?tab=orders">
            <Button className="w-full py-6 text-lg rounded-xl">View My Orders</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const payment = PAYMENT_OPTIONS.find((p) => p.value === order.paymentMethod);
  const paid = order.paymentStatus === "paid" || verification.data?.paymentStatus === "paid";
  // Unpaid online order: "open" while its stock is still held for payment.
  const unpaidOnline = isOnlinePayment(order.paymentMethod) && !paid;
  const released = unpaidOnline && verification.data?.orderOpen === false;
  const status = paid
    ? {
        icon: <CheckCircle className="w-12 h-12" />,
        tone: "bg-green-100 text-green-600",
        title: "Order Placed!",
        text: isOnlinePayment(order.paymentMethod)
          ? "Thank you for your order. Your payment was received and your order is confirmed."
          : `Thank you for your order. ${payment?.detail ?? "We will contact you to arrange payment."}`,
      }
    : released
      ? {
          icon: <XCircle className="w-12 h-12" />,
          tone: "bg-red-100 text-red-600",
          title: "Payment Not Completed",
          text: "This order was cancelled because payment wasn't completed within 60 minutes. Nothing was charged; you can place a new order.",
        }
      : unpaidOnline
        ? {
            icon: <Clock className="w-12 h-12" />,
            tone: "bg-amber-100 text-amber-600",
            title: "Awaiting Payment",
            text: "Your order is reserved for 60 minutes. Complete payment to confirm it. If you've just paid, this page updates automatically.",
          }
        : {
            icon: <CheckCircle className="w-12 h-12" />,
            tone: "bg-green-100 text-green-600",
            title: "Order Placed!",
            text: `Thank you for your order. ${payment?.detail ?? "We will contact you to arrange payment."}`,
          };

  return (
    <PageLayout mainClassName="container-app py-24 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-border p-10 text-center shadow-sm">

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`w-24 h-24 ${status.tone} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            {status.icon}
          </motion.div>

          <h1 className="text-3xl font-bold mb-2">{status.title}</h1>
          <p className="text-muted-foreground mb-8">{status.text}</p>

          <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-semibold">{order.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <Price amount={order.total} className="font-semibold" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-semibold">
                {payment?.label} · {paid ? "Paid" : "Not yet paid"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {unpaidOnline && !released && (
              <>
                <Button onClick={payNow} disabled={opening} className="w-full py-6 text-lg rounded-xl">
                  {opening ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Pay Now - <Price amount={order.total} />
                </Button>
                {payError && <p className="text-sm text-destructive">{payError}</p>}
              </>
            )}
            <Link href="/dashboard/buyer?tab=orders">
              <Button className="w-full py-6 text-lg rounded-xl">Track Your Order</Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" className="w-full py-6 text-lg rounded-xl">Continue Shopping</Button>
            </Link>
          </div>
        </div>
    </PageLayout>
  );
}

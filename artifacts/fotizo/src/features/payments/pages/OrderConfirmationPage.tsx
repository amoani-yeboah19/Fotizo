import { useState } from "react";
import { Link, useSearch } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { Loading } from "@/components/common/QueryStates";
import { CheckCircle, ClipboardCheck, Clock, Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useOrderDecision, useOrderDetail, useVerifyPayment } from "@/features/payments/hooks";
import { PAYMENT_OPTIONS, isOnlinePayment } from "@/features/payments/pages/CheckoutPage";
import { ordersService } from "@/features/payments/services/orders.service";
import { deliveryWindow } from "@/features/orders/confirmation";
import { apiErrorMessage } from "@/api";
import type { OrderDetail } from "@/types";

export default function OrderConfirmation() {
  const orderId = new URLSearchParams(useSearch()).get("order");
  const { data: order, isLoading, isError } = useOrderDetail(orderId);
  // Imported goods are confirmed first; payment only opens once the buyer accepts.
  const confirmation = order?.confirmationStatus ?? null;
  const readyToPay = confirmation === null || confirmation === "accepted";
  // Online orders: confirm with the provider (the redirect back proves nothing).
  const awaitingOnline = Boolean(
    order && readyToPay && isOnlinePayment(order.paymentMethod) && order.paymentStatus === "unpaid",
  );
  const verification = useVerifyPayment(orderId, awaitingOnline);
  const decision = useOrderDecision(orderId);
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

  const accept = async () => {
    setPayError("");
    try {
      const result = await decision.accept.mutateAsync();
      if (result.checkoutUrl) ordersService.openCheckout(result.checkoutUrl);
      else if (result.paymentError) setPayError(result.paymentError);
    } catch (error) {
      setPayError(apiErrorMessage(error, "We couldn't accept this quote. Refresh and try again."));
    }
  };

  const withdraw = async () => {
    setPayError("");
    try {
      await decision.withdraw.mutateAsync();
    } catch (error) {
      setPayError(apiErrorMessage(error, "We couldn't cancel this order. Refresh and try again."));
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
  const unpaidOnline = readyToPay && isOnlinePayment(order.paymentMethod) && !paid;
  const released = unpaidOnline && verification.data?.orderOpen === false;
  const quoted = confirmation === "quoted";
  const busy = decision.accept.isPending || decision.withdraw.isPending;
  const status =
    confirmation === "awaiting"
      ? {
          icon: <ClipboardCheck className="w-12 h-12" />,
          tone: "bg-amber-100 text-amber-600",
          title: "Confirming Your Items",
          text: "We're checking your options, the final price, the supplier's minimum order and delivery. You'll get a confirmed total to accept before you pay. Nothing has been charged.",
        }
      : quoted
        ? {
            icon: <ClipboardCheck className="w-12 h-12" />,
            tone: "bg-blue-100 text-blue-600",
            title: "Your Order Is Confirmed",
            text: "Review the confirmed items, price and delivery below, then accept to continue. Nothing is charged until you accept.",
          }
        : confirmation === "declined"
          ? {
              icon: <XCircle className="w-12 h-12" />,
              tone: "bg-red-100 text-red-600",
              title: "We Couldn't Supply This Order",
              text: "Nothing was charged. You can choose something similar from the shop.",
            }
          : confirmation === "withdrawn"
            ? {
                icon: <XCircle className="w-12 h-12" />,
                tone: "bg-red-100 text-red-600",
                title: "Order Cancelled",
                text: "You cancelled this order before paying. Nothing was charged.",
              }
            : confirmation === "expired"
              ? {
                  icon: <XCircle className="w-12 h-12" />,
                  tone: "bg-red-100 text-red-600",
                  title: "Quote Expired",
                  text: "The confirmed quote wasn't accepted in time, so the order was closed. Nothing was charged; you can order again.",
                }
              : paid
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
  const closed = confirmation === "declined" || confirmation === "withdrawn" || confirmation === "expired";

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

          {order.confirmationNote && (confirmation === "quoted" || confirmation === "declined") && (
            <div className="mb-6 rounded-xl border border-border p-4 text-left text-sm">
              <p className="font-semibold">Note from Fotizo</p>
              <p className="mt-1 text-muted-foreground whitespace-pre-line break-words">{order.confirmationNote}</p>
            </div>
          )}

          {(quoted || confirmation === "awaiting") && <ConfirmedItems order={order} />}

          <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-semibold">{order.reference}</span>
            </div>
            {quoted && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <Price amount={order.shipping} className="font-semibold" />
              </div>
            )}
            {deliveryWindow(order.deliveryDaysMin, order.deliveryDaysMax) && !closed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery time</span>
                <span className="font-semibold">{deliveryWindow(order.deliveryDaysMin, order.deliveryDaysMax)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {confirmation === "awaiting" ? "Estimated total" : quoted ? "Confirmed total" : "Total"}
              </span>
              <Price amount={order.total} className="font-semibold" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-semibold">
                {payment?.label} · {paid ? "Paid" : "Not yet paid"}
              </span>
            </div>
            {quoted && order.quoteExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Accept by {new Date(order.quoteExpiresAt).toLocaleDateString(undefined, { day: "numeric", month: "long" })} to keep this price.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {quoted && (
              <>
                <Button onClick={accept} disabled={busy} className="w-full py-6 text-lg rounded-xl">
                  {decision.accept.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {isOnlinePayment(order.paymentMethod) ? "Accept & Pay" : "Accept Order"} - <Price amount={order.total} />
                </Button>
                <Button variant="outline" onClick={withdraw} disabled={busy} className="w-full py-6 text-lg rounded-xl">
                  {decision.withdraw.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Cancel Order
                </Button>
              </>
            )}
            {confirmation === "awaiting" && (
              <Button variant="outline" onClick={withdraw} disabled={busy} className="w-full py-6 text-lg rounded-xl">
                {decision.withdraw.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Cancel Request
              </Button>
            )}
            {unpaidOnline && !released && (
              <Button onClick={payNow} disabled={opening} className="w-full py-6 text-lg rounded-xl">
                {opening ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Pay Now - <Price amount={order.total} />
              </Button>
            )}
            {payError && <p className="text-sm text-destructive">{payError}</p>}
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

/** Imported lines with what was asked for, and once quoted, what was confirmed. */
function ConfirmedItems({ order }: { order: OrderDetail }) {
  const quoted = order.confirmationStatus === "quoted";
  return (
    <ul className="mb-6 space-y-3 text-left text-sm">
      {order.items.map((item) => {
        const changed = quoted && item.estimatedPrice != null && item.estimatedPrice !== item.price;
        return (
          <li key={item.id} className="rounded-xl border border-border p-3">
            <div className="flex justify-between gap-3">
              <span className="min-w-0 font-medium break-words">
                {item.quantity}x {item.productTitle}
              </span>
              <Price amount={item.price * item.quantity} className="shrink-0 font-semibold" />
            </div>
            {item.needsConfirmation && (
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {(item.confirmedOptions || item.requestedOptions) && (
                  <p className="break-words">
                    {quoted && item.confirmedOptions ? "Confirmed: " : "Requested: "}
                    {item.confirmedOptions || item.requestedOptions}
                  </p>
                )}
                {changed ? (
                  <p>
                    <Price amount={item.price} /> each (estimated <Price amount={item.estimatedPrice!} />)
                  </p>
                ) : (
                  <p>{quoted ? "Price confirmed" : "Estimated price, to be confirmed"}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

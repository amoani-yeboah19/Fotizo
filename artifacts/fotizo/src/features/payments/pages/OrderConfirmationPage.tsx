import { Link, useSearch } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { Loading } from "@/components/common/QueryStates";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useOrderDetail } from "@/features/payments/hooks";
import { PAYMENT_OPTIONS } from "@/features/payments/pages/CheckoutPage";

export default function OrderConfirmation() {
  const orderId = new URLSearchParams(useSearch()).get("order");
  const { data: order, isLoading, isError } = useOrderDetail(orderId);

  if (isLoading) {
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

  return (
    <PageLayout mainClassName="container-app py-24 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-border p-10 text-center shadow-sm">

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-2">Order Placed!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your order. {payment?.detail ?? "We will contact you to arrange payment."}
          </p>

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
                {payment?.label} · {order.paymentStatus === "paid" ? "Paid" : "Not yet paid"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
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

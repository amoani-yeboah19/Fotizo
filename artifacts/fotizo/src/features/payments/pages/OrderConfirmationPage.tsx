import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderConfirmation() {
  const orderNumber = `FTZ-${Math.floor(100000 + Math.random() * 900000)}`;

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

          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your purchase. We've sent a confirmation email with your order details.
          </p>

          <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-semibold">{orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Delivery</span>
              <span className="font-semibold">3-5 business days</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/dashboard/buyer">
              <Button className="w-full py-6 text-lg rounded-xl">Track Your Order</Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="w-full py-6 text-lg rounded-xl">Continue Shopping</Button>
            </Link>
          </div>
        </div>
    </PageLayout>
  );
}

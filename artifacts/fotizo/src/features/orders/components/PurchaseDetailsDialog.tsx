import { useState, type ReactElement } from "react";
import { Link } from "wouter";
import { Package } from "lucide-react";
import type { Order } from "@/types";
import { Price } from "@/components/common/Price";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { ORDERS_USE_MOCKS } from "@/api";
import { ReportProblem } from "./ReportProblem";
import { purchaseStatus } from "@/features/orders/confirmation";
export { purchaseStatusTone } from "@/features/orders/confirmation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

// Show the purchased snapshot, not today's catalogue price or availability.
export function PurchaseDetailsDialog({
  order,
  children,
}: {
  order: Order;
  children: ReactElement;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const status = purchaseStatus(order);
  // Imported items wait for Fotizo's confirmed quote, reviewed on the order page.
  const decisionPending = order.confirmationStatus === "awaiting" || order.confirmationStatus === "quoted";
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase details</DialogTitle>
          <DialogDescription>
            Details of your purchased item and its current order status.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {order.productImage && !imageFailed ? (
            <img
              src={order.productImage}
              alt={order.productTitle}
              onError={() => setImageFailed(true)}
              className="h-32 w-32 self-center sm:self-start rounded-xl bg-muted object-contain p-3 shrink-0"
            />
          ) : (
            <div
              className="h-32 w-32 self-center sm:self-start rounded-xl bg-muted flex items-center justify-center shrink-0"
              aria-label="Product image unavailable"
            >
              <Package
                className="h-10 w-10 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-lg break-words">
              {order.productTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sold by {order.seller}
            </p>
            <StatusBadge tone={status.tone} className="mt-3 capitalize">
              {status.label}
            </StatusBadge>
          </div>
        </div>
        <dl className="space-y-3 rounded-xl border border-border p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Purchase reference</dt>
            <dd className="mt-1 font-mono text-xs break-all">{order.reference ?? order.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Order date</dt>
            <dd>{order.date}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Quantity</dt>
            <dd>{order.quantity}</dd>
          </div>
          {(order.confirmedOptions || order.requestedOptions) && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {order.confirmedOptions ? "Confirmed options" : "Options requested"}
              </dt>
              <dd className="text-right break-words">{order.confirmedOptions || order.requestedOptions}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {order.needsConfirmation && order.confirmationStatus === "awaiting" ? "Estimated price per item" : "Price per item"}
            </dt>
            <dd>
              <Price amount={order.price} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold">
            <dt>Item total</dt>
            <dd>
              <Price amount={order.price * order.quantity} />
            </dd>
          </div>
        </dl>
        <div className="rounded-xl bg-muted/50 p-4">
          <h3 className="text-sm font-semibold">Tracking</h3>
          <p className="mt-1 text-sm text-muted-foreground break-all">
            {order.trackingNumber ||
              (order.status === "cancelled"
                ? "This purchase was cancelled."
                : "No tracking number is available for this item.")}
          </p>
        </div>
        {decisionPending && order.orderId && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="text-muted-foreground">
              {order.confirmationStatus === "quoted"
                ? "Fotizo has confirmed the options, final price and delivery for this order. Review and accept it to continue."
                : "Fotizo is confirming the options, final price and delivery with the supplier. Nothing has been charged."}
            </p>
            <Link href={`/order-confirmation?order=${order.orderId}`}>
              <Button size="sm" className="mt-3">
                {order.confirmationStatus === "quoted" ? "Review confirmed quote" : "View order"}
              </Button>
            </Link>
          </div>
        )}
        {/* Demo orders have no server record to report against. */}
        {!ORDERS_USE_MOCKS && order.orderId && <ReportProblem orderId={order.orderId} />}
        <DialogClose asChild>
          <Button variant="outline" className="w-full sm:w-auto sm:self-end">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

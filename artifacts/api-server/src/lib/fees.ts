import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  db,
  FEE_SCHEDULE,
  isFeeCurrency,
  orderItemsTable,
  ordersTable,
  platformFeesTable,
  productsTable,
  type BookingRow,
} from "@workspace/db";
import type { Tx } from "./admin";
import { logger } from "./logger";

// Fotizo's fees, recorded server-side from stored prices and quantities —
// never from amounts a client sends. Each booking and each order line is
// charged at most once (unique indexes), so retried payment confirmations and
// repeated webhooks cannot double-charge. Collection is not active yet: fees
// are recorded as pending until deduction timing and reversals are agreed.

const round2 = (n: number) => Math.round(n * 100) / 100;

// Whether Fotizo's own sourced shop also pays the per-unit seller fee on top
// of its 30% markup is undecided; it doesn't unless this is switched on.
const feesOnFotizoShop = () => process.env.FEES_ON_FOTIZO_SHOP === "true";

/**
 * Per-unit seller fees for an order that has just been paid: one fee per
 * order line, quantity x the flat amount in the transaction currency. The
 * seller bears it; the buyer's total is unchanged.
 *
 * `payment` is the provider charge that paid the order (currency and units
 * per GBP); without one (pay on delivery) the order's own currency applies.
 */
export async function recordUnitSaleFees(
  tx: Tx,
  orderId: string,
  payment?: { currency: string; exchangeRate: number },
) {
  const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return 0;
  const currency = (payment?.currency ?? order.currency).toUpperCase();
  const rate = payment?.exchangeRate ?? 1;
  if (!isFeeCurrency(currency)) {
    // Never fall back to another currency's amount.
    logger.error({ orderId, currency }, "No seller fee is defined for this transaction currency");
    return 0;
  }
  const lines = await tx
    .select({ line: orderItemsTable, channel: productsTable.channel })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .where(and(eq(orderItemsTable.orderId, orderId), ne(orderItemsTable.status, "cancelled")));
  let recorded = 0;
  for (const { line, channel } of lines) {
    if (channel === "shop" && !feesOnFotizoShop()) continue;
    const inserted = await tx
      .insert(platformFeesTable)
      .values({
        kind: "unit_sale",
        accountId: line.sellerId,
        orderId,
        orderItemId: line.id,
        reference: order.reference ?? order.id,
        currency,
        quantity: line.quantity,
        amount: line.quantity * FEE_SCHEDULE.seller[currency],
        grossAmount: round2(line.price * line.quantity * rate),
      })
      .onConflictDoNothing()
      .returning({ id: platformFeesTable.id });
    recorded += inserted.length;
  }
  return recorded;
}

/**
 * The flat artisan fee for one booking. Every booking is charged, including
 * repeat bookings by the same customer; the booking ID keeps it to one fee.
 * Booking prices are in GBP.
 */
export async function recordBookingFee(tx: Tx, booking: BookingRow) {
  const inserted = await tx
    .insert(platformFeesTable)
    .values({
      kind: "booking",
      accountId: booking.providerId,
      bookingId: booking.id,
      reference: booking.reference,
      currency: "GBP",
      quantity: 1,
      amount: FEE_SCHEDULE.artisan.GBP,
      grossAmount: booking.packagePrice,
    })
    .onConflictDoNothing()
    .returning({ id: platformFeesTable.id });
  return inserted.length;
}

/** Gross earnings, fees and net per currency for one seller or provider. */
export async function earningsFor(accountId: string) {
  const totals = await db
    .select({
      currency: platformFeesTable.currency,
      gross: sql<string>`sum(${platformFeesTable.grossAmount})`,
      fees: sql<string>`sum(${platformFeesTable.amount}) filter (where ${platformFeesTable.status} <> 'waived' and ${platformFeesTable.status} <> 'reversed')`,
      count: sql<number>`count(*)::int`,
    })
    .from(platformFeesTable)
    .where(eq(platformFeesTable.accountId, accountId))
    .groupBy(platformFeesTable.currency)
    .orderBy(platformFeesTable.currency);
  const items = await db
    .select({
      fee: platformFeesTable,
      productTitle: orderItemsTable.productTitle,
      serviceTitle: sql<string | null>`(select service_title from bookings where bookings.id = ${platformFeesTable.bookingId})`,
    })
    .from(platformFeesTable)
    .leftJoin(orderItemsTable, eq(orderItemsTable.id, platformFeesTable.orderItemId))
    .where(eq(platformFeesTable.accountId, accountId))
    .orderBy(desc(platformFeesTable.createdAt), desc(platformFeesTable.id))
    .limit(50);
  return {
    // Fees are recorded but not yet deducted from payouts.
    collectionActive: false,
    totals: totals.map((t) => {
      const gross = round2(Number(t.gross ?? 0));
      const fees = round2(Number(t.fees ?? 0));
      return { currency: t.currency, gross, fees, net: round2(gross - fees), count: t.count };
    }),
    items: items.map(({ fee, productTitle, serviceTitle }) => ({
      id: fee.id,
      kind: fee.kind,
      reference: fee.reference,
      title: productTitle ?? serviceTitle ?? fee.reference,
      quantity: fee.quantity,
      currency: fee.currency,
      gross: fee.grossAmount,
      fee: fee.amount,
      net: round2(fee.grossAmount - (fee.status === "waived" || fee.status === "reversed" ? 0 : fee.amount)),
      status: fee.status,
      createdAt: fee.createdAt.toISOString(),
    })),
  };
}

import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  productsTable,
  servicesTable,
  ordersTable,
  orderItemsTable,
  supportRequestsTable,
  vehicleEnquiriesTable,
  vehiclesTable,
  SUPPORT_STATUSES,
  ENQUIRY_STATUSES,
} from "@workspace/db";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/requireAuth";
import { changeCaseStatus, listCaseEvents, type CaseType } from "../lib/cases";
import { toPublicVehicle } from "./vehicles";

// Staff operations. Figures are computed from stored records on each request;
// months are calendar months in UTC.
const router: IRouter = Router();
router.use("/operations", requireAuth);

const PAGE_SIZE = 25;
const pageSchema = z.coerce.number().int().min(0).max(100_000).default(0);
const literal = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;
// Order value excludes cancelled lines. Checkout is disabled, so no stored order
// has been paid online; this is recorded order value, not collected revenue.
const lineValue = sql<number>`coalesce(sum(${orderItemsTable.price} * ${orderItemsTable.quantity}) filter (where ${orderItemsTable.status} <> 'cancelled'), 0)::float8`;
const thisMonth = sql`date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'`;

router.get(
  "/operations/overview",
  requireRole("manager", "representative", "china_representative"),
  async (_req, res) => {
    const [users] = await db
      .select({
        total: sql<number>`count(*)::int`,
        buyers: sql<number>`count(*) filter (where ${usersTable.role} = 'buyer')::int`,
        sellers: sql<number>`count(*) filter (where ${usersTable.role} = 'seller')::int`,
        newThisMonth: sql<number>`count(*) filter (where ${usersTable.createdAt} >= ${thisMonth})::int`,
        suspended: sql<number>`count(*) filter (where ${usersTable.suspendedAt} is not null)::int`,
      })
      .from(usersTable);
    const [listings] = await db
      .select({
        marketplace: sql<number>`count(*) filter (where ${productsTable.channel} = 'marketplace' and ${productsTable.status} = 'active')::int`,
        shop: sql<number>`count(*) filter (where ${productsTable.channel} = 'shop' and ${productsTable.status} = 'active')::int`,
        unpublished: sql<number>`count(*) filter (where ${productsTable.status} = 'unpublished')::int`,
        lowStock: sql<number>`count(*) filter (where ${productsTable.status} = 'active' and ${productsTable.stockCount} <= 5)::int`,
      })
      .from(productsTable);
    const [services] = await db
      .select({ active: sql<number>`count(*)::int` })
      .from(servicesTable)
      .where(eq(servicesTable.status, "active"));
    const [orders] = await db
      .select({
        lines: sql<number>`count(*)::int`,
        value: lineValue,
        linesThisMonth: sql<number>`count(*) filter (where ${ordersTable.createdAt} >= ${thisMonth})::int`,
        valueThisMonth: sql<number>`coalesce(sum(${orderItemsTable.price} * ${orderItemsTable.quantity}) filter (where ${orderItemsTable.status} <> 'cancelled' and ${ordersTable.createdAt} >= ${thisMonth}), 0)::float8`,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId));
    const month = sql<string>`to_char(date_trunc('month', ${ordersTable.createdAt} at time zone 'UTC'), 'YYYY-MM')`;
    const monthlyRows = await db
      .select({ month, value: lineValue, lines: sql<number>`count(*)::int` })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(sql`${ordersTable.createdAt} >= ${thisMonth} - interval '5 months'`)
      .groupBy(month);
    const byMonth = new Map(monthlyRows.map((r) => [r.month, r]));
    const now = new Date();
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
      const key = d.toISOString().slice(0, 7);
      return { month: key, value: byMonth.get(key)?.value ?? 0, lines: byMonth.get(key)?.lines ?? 0 };
    });
    const topCategories = await db
      .select({ category: productsTable.category, listings: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "active"),
          eq(productsTable.channel, "marketplace"),
        ),
      )
      .groupBy(productsTable.category)
      .orderBy(desc(sql`count(*)`), productsTable.category)
      .limit(5);
    const [support] = await db
      .select({
        open: sql<number>`count(*) filter (where ${supportRequestsTable.status} = 'open')::int`,
        inProgress: sql<number>`count(*) filter (where ${supportRequestsTable.status} = 'in_progress')::int`,
      })
      .from(supportRequestsTable);
    const [enquiries] = await db
      .select({
        new: sql<number>`count(*) filter (where ${vehicleEnquiriesTable.status} = 'new')::int`,
        active: sql<number>`count(*) filter (where ${vehicleEnquiriesTable.status} in ('contacted', 'quoted'))::int`,
      })
      .from(vehicleEnquiriesTable);
    const [vehicles] = await db
      .select({
        active: sql<number>`count(*) filter (where ${vehiclesTable.status} = 'active')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(vehiclesTable);
    res.json({
      users,
      listings: { ...listings, services: services.active },
      orders: { ...orders, monthly },
      topCategories,
      support,
      vehicleEnquiries: enquiries,
      vehicles,
    });
  },
);

router.get(
  "/operations/sellers",
  requireRole("manager", "representative"),
  async (req, res) => {
    const parsed = z
      .object({ page: pageSchema, q: z.string().trim().max(120).default("") })
      .strict()
      .safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid seller filters." });
      return;
    }
    const { page, q } = parsed.data;
    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        createdAt: usersTable.createdAt,
        suspendedAt: usersTable.suspendedAt,
        // Correlated subqueries use explicit aliases: Drizzle renders bare column
        // names inside single-table selects, which would bind to the inner table.
        activeListings: sql<number>`(select count(*) from products p where p.seller_id = "users"."id" and p.status = 'active')::int`,
        orderLines: sql<number>`(select count(*) from order_items i where i.seller_id = "users"."id")::int`,
        orderValue: sql<number>`(select coalesce(sum(i.price * i.quantity), 0) from order_items i where i.seller_id = "users"."id" and i.status <> 'cancelled')::float8`,
      })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.role, "seller"),
          q
            ? or(ilike(usersTable.name, literal(q)), ilike(usersTable.email, literal(q)))
            : undefined,
        ),
      )
      .orderBy(desc(usersTable.createdAt), desc(usersTable.id))
      .limit(PAGE_SIZE + 1)
      .offset(page * PAGE_SIZE);
    res.json({ items: rows.slice(0, PAGE_SIZE), page, hasMore: rows.length > PAGE_SIZE });
  },
);

router.get(
  "/operations/orders",
  requireRole("manager", "representative"),
  async (req, res) => {
    const parsed = z.object({ page: pageSchema }).strict().safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid order filters." });
      return;
    }
    const { page } = parsed.data;
    const rows = await db
      .select({
        id: orderItemsTable.id,
        orderId: orderItemsTable.orderId,
        productTitle: orderItemsTable.productTitle,
        seller: orderItemsTable.seller,
        buyer: usersTable.name,
        quantity: orderItemsTable.quantity,
        total: sql<number>`(${orderItemsTable.price} * ${orderItemsTable.quantity})::float8`,
        status: orderItemsTable.status,
        createdAt: ordersTable.createdAt,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .innerJoin(usersTable, eq(usersTable.id, ordersTable.buyerId))
      .orderBy(desc(ordersTable.createdAt), desc(orderItemsTable.id))
      .limit(PAGE_SIZE + 1)
      .offset(page * PAGE_SIZE);
    res.json({ items: rows.slice(0, PAGE_SIZE), page, hasMore: rows.length > PAGE_SIZE });
  },
);

// Case queues: support belongs to managers; vehicle leads to managers and the
// China representative who handles sourcing.
const CASES = {
  support: {
    path: "/operations/support-requests",
    roles: ["manager"],
    table: supportRequestsTable,
    statuses: SUPPORT_STATUSES,
  },
  vehicle_enquiry: {
    path: "/operations/vehicle-enquiries",
    roles: ["manager", "china_representative"],
    table: vehicleEnquiriesTable,
    statuses: ENQUIRY_STATUSES,
  },
} as const;

const changeSchema = z
  .object({
    status: z.string(),
    expectedVersion: z.number().int().min(0),
    note: z.string().trim().max(1000).default(""),
  })
  .strict();

for (const [type, config] of Object.entries(CASES) as [
  CaseType,
  (typeof CASES)[CaseType],
][]) {
  const guard = requireRole(...config.roles);
  router.get(config.path, guard, async (req, res) => {
    const parsed = z
      .object({
        page: pageSchema,
        status: z.enum(["all", ...config.statuses]).default("all"),
      })
      .strict()
      .safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid case filters." });
      return;
    }
    const { page, status } = parsed.data;
    const table = config.table;
    const rows = await db
      .select()
      .from(table)
      .where(status === "all" ? undefined : eq(table.status, status as never))
      .orderBy(desc(table.createdAt), desc(table.id))
      .limit(PAGE_SIZE + 1)
      .offset(page * PAGE_SIZE);
    res.json({ items: rows.slice(0, PAGE_SIZE), page, hasMore: rows.length > PAGE_SIZE });
  });
  router.get(`${config.path}/:id/events`, guard, async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) {
      res.status(404).json({ error: "Case not found." });
      return;
    }
    res.json(await listCaseEvents(type, id.data));
  });
  router.post(
    `${config.path}/:id/status`,
    guard,
    async (req: AuthenticatedRequest, res) => {
      const id = z.string().uuid().safeParse(req.params.id);
      const parsed = changeSchema.safeParse(req.body);
      if (!id.success || !parsed.success) {
        res.status(400).json({
          error: "Choose a valid status, refresh the case, and keep notes under 1000 characters.",
        });
        return;
      }
      const outcome = await changeCaseStatus(type, id.data, req.auth!.userId, parsed.data);
      if (outcome.status !== 200) {
        res.status(outcome.status).json({ error: outcome.error });
        return;
      }
      res.json(outcome.result);
    },
  );
}

const vehicleGuard = requireRole("manager", "china_representative");
router.get("/operations/vehicles", vehicleGuard, async (_req, res) => {
  const rows = await db
    .select()
    .from(vehiclesTable)
    .orderBy(vehiclesTable.make, vehiclesTable.model, vehiclesTable.id)
    .limit(500);
  res.json(rows.map(toPublicVehicle));
});

router.post("/operations/vehicles/:id/status", vehicleGuard, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const body = z
    .object({ status: z.enum(["active", "unpublished"]) })
    .strict()
    .safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: "Choose a vehicle and a valid status." });
    return;
  }
  const [row] = await db
    .update(vehiclesTable)
    .set({ status: body.data.status, updatedAt: new Date() })
    .where(eq(vehiclesTable.id, id.data))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Vehicle not found." });
    return;
  }
  res.json(toPublicVehicle(row));
});

export default router;

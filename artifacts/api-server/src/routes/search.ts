import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, productsTable, servicesTable, usersTable, vehiclesTable } from "@workspace/db";
import { SERVICE_CATEGORIES } from "@workspace/service-taxonomy";
import { catalogueQuery, catalogueWhere } from "../lib/catalogue";
import { escapeLike } from "../lib/admin";
import { toPublicProduct } from "./products";
import { toPublicService } from "./services";
import { toPublicVehicle } from "./vehicles";

// One search across everything customers can browse: marketplace products,
// Fotizo Shop stock, services and vehicles. Each group returns its best
// matches and a total, so the navbar can suggest results and link to the
// full, filterable page for each group.
const router: IRouter = Router();

const searchQuery = z
  .object({
    q: z.string().trim().max(100).default(""),
    limit: z.coerce.number().int().min(1).max(12).default(4),
  })
  .strict();

const empty = { items: [], total: 0 };

router.get("/search", async (req, res) => {
  const parsed = searchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Search for up to 100 characters." });
    return;
  }
  const { q, limit } = parsed.data;
  res.setHeader("Cache-Control", "public, max-age=30");
  if (q.length < 2) {
    res.json({ q, products: empty, shop: empty, services: empty, vehicles: empty });
    return;
  }
  const term = escapeLike(q);
  // Titles that match rank above matches found only in the seller or category.
  const titleFirst = (column: Parameters<typeof ilike>[0]) => sql`case when ${column} ilike ${term} then 0 else 1 end`;

  const products = async (channel: "marketplace" | "shop") => {
    const where = catalogueWhere(catalogueQuery.parse({ channel, q }));
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ product: productsTable, sellerName: usersTable.name })
        .from(productsTable)
        .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
        .where(where)
        .orderBy(titleFirst(productsTable.title), desc(productsTable.rating), desc(productsTable.createdAt))
        .limit(limit),
      db
        .select({ total: count() })
        .from(productsTable)
        .leftJoin(usersTable, eq(productsTable.sellerId, usersTable.id))
        .where(where),
    ]);
    return { items: rows.map((r) => toPublicProduct(r.product, r.sellerName ?? "Unknown seller")), total };
  };

  const services = async () => {
    // "plumber" should find Plumbing: match category labels and aliases too.
    const needle = q.toLowerCase();
    const categories = SERVICE_CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(needle) || c.aliases?.some((a) => a.toLowerCase().includes(needle)),
    ).map((c) => c.id);
    const where = and(
      eq(servicesTable.status, "active"),
      or(
        ilike(servicesTable.title, term),
        ilike(servicesTable.description, term),
        ilike(usersTable.name, term),
        sql`array_to_string(${servicesTable.skills}, ' ') ilike ${term}`,
        categories.length ? inArray(servicesTable.category, categories) : undefined,
      ),
    );
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ service: servicesTable, providerName: usersTable.name })
        .from(servicesTable)
        .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
        .where(where)
        .orderBy(titleFirst(servicesTable.title), desc(servicesTable.rating), desc(servicesTable.createdAt))
        .limit(limit),
      db
        .select({ total: count() })
        .from(servicesTable)
        .leftJoin(usersTable, eq(servicesTable.providerId, usersTable.id))
        .where(where),
    ]);
    return { items: rows.map((r) => toPublicService(r.service, r.providerName ?? "Unknown provider")), total };
  };

  const vehicles = async () => {
    const name = sql`${vehiclesTable.make} || ' ' || ${vehiclesTable.model}`;
    const where = and(
      eq(vehiclesTable.status, "active"),
      or(
        sql`${name} ilike ${term}`,
        ilike(vehiclesTable.bodyType, term),
        ilike(vehiclesTable.fuel, term),
        ilike(vehiclesTable.description, term),
      ),
    );
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(vehiclesTable)
        .where(where)
        .orderBy(sql`case when ${name} ilike ${term} then 0 else 1 end`, vehiclesTable.make, vehiclesTable.model)
        .limit(limit),
      db.select({ total: count() }).from(vehiclesTable).where(where),
    ]);
    return { items: rows.map(toPublicVehicle), total };
  };

  const [marketplace, shop, serviceResults, vehicleResults] = await Promise.all([
    products("marketplace"),
    products("shop"),
    services(),
    vehicles(),
  ]);
  res.json({ q, products: marketplace, shop, services: serviceResults, vehicles: vehicleResults });
});

export default router;

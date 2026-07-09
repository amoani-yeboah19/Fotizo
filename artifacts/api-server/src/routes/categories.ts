import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, categoriesTable, productsTable } from "@workspace/db";

const router: IRouter = Router();

// Product counts are computed from the live table rather than stored, so
// they never drift as products are added/removed.
router.get("/categories", async (_req, res) => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      icon: categoriesTable.icon,
      count: count(productsTable.id),
    })
    .from(categoriesTable)
    .leftJoin(productsTable, eq(productsTable.category, categoriesTable.name))
    .groupBy(categoriesTable.id);

  res.json(rows);
});

export default router;

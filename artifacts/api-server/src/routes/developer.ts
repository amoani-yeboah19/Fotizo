import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { requestMetricsSnapshot } from "../lib/request-metrics";
import { probeReadiness } from "../lib/readiness";

const router: IRouter = Router();
router.use("/developer", requireAuth, requireRole("developer", "manager"));

router.get("/developer/stats", async (_req, res) => {
  let databaseReady = true;
  try {
    await probeReadiness();
  } catch {
    databaseReady = false;
  }
  let migrations: { name: string; appliedAt: string }[] = [];
  if (databaseReady) {
    try {
      const result = await db.execute<{ name: string; applied_at: Date }>(
        sql`SELECT name, applied_at FROM fotizo_migrations ORDER BY name`,
      );
      migrations = result.rows.map((r) => ({
        name: r.name,
        appliedAt: new Date(r.applied_at).toISOString(),
      }));
    } catch {
      // Databases created by schema push have no migration ledger.
      migrations = [];
    }
  }
  res.json({
    ...requestMetricsSnapshot(),
    node: process.version,
    environment: process.env.NODE_ENV ?? "development",
    database: { ready: databaseReady, migrations },
  });
});

export default router;

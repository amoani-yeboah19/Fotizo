import "dotenv/config";
import { createServer } from "node:http";
import app from "./app";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { checkDatabaseReadiness, runtimeState } from "./lib/readiness";
import { createShutdown, parsePort } from "./lib/lifecycle";
import { releaseAbandonedOrders } from "./lib/payments";

// Releases stock held by online orders whose payment was never completed.
const RELEASE_INTERVAL_MS = 10 * 60 * 1000;
function scheduleAbandonedOrderRelease() {
  const timer = setInterval(() => {
    releaseAbandonedOrders()
      .then((released) => released && logger.info({ released }, "Released unpaid online orders"))
      .catch((error: Error) => logger.warn({ errorType: error.name }, "Releasing unpaid orders failed"));
  }, RELEASE_INTERVAL_MS);
  timer.unref();
}

async function start() {
  const port = parsePort(process.env.PORT);
  await checkDatabaseReadiness();
  const server = createServer(app);
  const shutdown = createShutdown(server, {
    markDraining: () => {
      runtimeState.draining = true;
      logger.info("Server draining");
    },
    closeDatabase: () => pool.end(),
    exit: (code) => {
      logger.info({ code }, "Server stopped");
      process.exit(code);
    },
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    logger.error(
      { code: error.code, errorType: error.name },
      "HTTP server failed",
    );
    void shutdown(1);
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
  server.listen(port, () => logger.info({ port }, "Server listening"));
  scheduleAbandonedOrderRelease();
}

// Idle pool errors need a listener; readiness still fails while the DB is unavailable.
pool.on("error", (error: Error) =>
  logger.error({ errorType: error.name }, "Idle database connection failed"),
);
start().catch(async (error: Error) => {
  logger.fatal(
    { errorType: error.name },
    "API startup failed; check PORT, database connectivity and migrations",
  );
  await pool.end().catch(() => undefined);
  process.exit(1);
});

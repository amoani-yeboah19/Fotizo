import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

import { probeReadiness, runtimeState } from "../lib/readiness";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (runtimeState.draining) {
    res.status(503).json({ status: "not_ready" });
    return;
  }
  try {
    await probeReadiness();
    // Shutdown may have begun while the database query was running.
    res
      .status(runtimeState.draining ? 503 : 200)
      .json({ status: runtimeState.draining ? "not_ready" : "ready" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

export default router;

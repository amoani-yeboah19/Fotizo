import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { recordRequestMetrics } from "./lib/request-metrics";
import { paymentWebhooks } from "./routes/payments";

import {
  configuredOrigins,
  protectBrowserWrites,
  apiErrorHandler,
} from "./middlewares/security";
const app: Express = express();
const origins = configuredOrigins();
const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0)
  throw new Error("Invalid TRUST_PROXY_HOPS.");
app.set("trust proxy", proxyHops);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    // Cookies only work cross-origin when the allowed origin is named
    // explicitly (not "*") and credentials are enabled on both sides.
    origin: origins,
    credentials: true,
  }),
);
app.use("/api", recordRequestMetrics);
// Provider webhooks are server-to-server and signature-verified over the raw
// body, so they sit before the JSON parser and the browser-origin check.
app.use("/api/payments/webhooks", paymentWebhooks);
app.use("/api", protectBrowserWrites(origins));
// Default 100kb body limit is too small for product/service photos, which
// arrive as base64 data URLs (a single downscaled JPEG easily exceeds it).
app.use(express.json({ limit: "10mb" }));

app.use(cookieParser());

app.use("/api", router);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});
app.use(apiErrorHandler);

export default app;

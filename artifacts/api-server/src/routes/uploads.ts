import express, { Router, type IRouter } from "express";
import { z } from "zod";
import { MEDIA_PURPOSES } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { consumeAuthAttempt } from "../middlewares/security";
import { MAX_IMAGE_BYTES, StorageError, storageHealth, storeImage } from "../lib/storage";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Who may upload for which purpose: listings match who may create them;
// every signed-in account can have a profile photo.
const UPLOAD_ROLES: Record<(typeof MEDIA_PURPOSES)[number], string[] | "any"> = {
  product: ["seller", "china_representative"],
  service: ["seller"],
  avatar: "any",
};
const UPLOADS_PER_WINDOW = 60;

// The body is the image itself (any Content-Type); its real type is checked
// from the bytes. Limited just above the stored maximum so oversized files get
// a clear 413 from storeImage rather than a parser error.
router.post(
  "/uploads/images",
  requireAuth,
  express.raw({ type: () => true, limit: MAX_IMAGE_BYTES + 1024 }),
  async (req: AuthenticatedRequest, res) => {
    const purpose = z.enum(MEDIA_PURPOSES).safeParse(req.query.purpose);
    if (!purpose.success) {
      res.status(400).json({ error: "Say what the image is for." });
      return;
    }
    const allowed = UPLOAD_ROLES[purpose.data];
    if (allowed !== "any" && !allowed.includes(req.auth!.role)) {
      res.status(403).json({ error: "This account can't upload images for that." });
      return;
    }
    const attempts = await consumeAuthAttempt(`upload:${req.auth!.userId}`, UPLOADS_PER_WINDOW);
    if (!attempts.allowed) {
      res.setHeader("Retry-After", attempts.retryAfter);
      res.status(429).json({ error: "Too many uploads. Please wait a few minutes." });
      return;
    }
    try {
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      res.status(201).json(await storeImage(req.auth!.userId, purpose.data, body));
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      if (error.status >= 500) logger.warn({ reason: error.reason, purpose: purpose.data }, "Image upload failed");
      res.status(error.status).json({ error: error.message });
    }
  },
);

// For whoever deploys the API: open this while signed in to see whether image
// storage is set up. Shows no secrets.
router.get("/uploads/status", requireAuth, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await storageHealth());
});

export default router;

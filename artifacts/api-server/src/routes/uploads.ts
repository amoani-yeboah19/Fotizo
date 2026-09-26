import express, { Router, type IRouter } from "express";
import { z } from "zod";
import { MEDIA_PURPOSES } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { consumeAuthAttempt } from "../middlewares/security";
import { MAX_IMAGE_BYTES, StorageError, storeImage } from "../lib/storage";

const router: IRouter = Router();

// Who may upload for which kind of listing, matching who may create it.
const UPLOAD_ROLES: Record<(typeof MEDIA_PURPOSES)[number], string[]> = {
  product: ["seller", "china_representative"],
  service: ["seller"],
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
    if (!UPLOAD_ROLES[purpose.data].includes(req.auth!.role)) {
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
      res.status(error.status).json({ error: error.message });
    }
  },
);

export default router;

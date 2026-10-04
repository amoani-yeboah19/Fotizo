import { Router, type IRouter } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { earningsFor } from "../lib/fees";

const router: IRouter = Router();

// A seller's or provider's gross earnings, Fotizo fees and net payout per
// currency, with their recent fee records. Calculated from stored sales.
router.get("/earnings", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await earningsFor(req.auth!.userId));
});

export default router;

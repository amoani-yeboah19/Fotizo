import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import categoriesRouter from "./categories";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(productsRouter);
router.use(categoriesRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import aiRouter from "./ai";
import ordersRouter from "./orders";
import servicesRouter from "./services";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use("/ai", aiRouter);
router.use(ordersRouter);
router.use(servicesRouter);

export default router;

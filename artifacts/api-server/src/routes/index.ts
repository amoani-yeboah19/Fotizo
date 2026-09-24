import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import aiRouter from "./ai";
import ordersRouter from "./orders";
import servicesRouter from "./services";
import conversationsRouter from "./conversations";
import supportRouter from "./support";
import vehiclesRouter from "./vehicles";
import currencyRouter from "./currency";
import operationsRouter from "./operations";
import developerRouter from "./developer";
import wishlistRouter from "./wishlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/auth", authRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use("/ai", aiRouter);
router.use(ordersRouter);
router.use(servicesRouter);
router.use(conversationsRouter);
router.use(supportRouter);
router.use(vehiclesRouter);
router.use(currencyRouter);
router.use(operationsRouter);
router.use(developerRouter);
router.use(wishlistRouter);

export default router;

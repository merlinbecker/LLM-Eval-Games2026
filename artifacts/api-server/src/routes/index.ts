import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gatewaysRouter from "./gateways";
import datasetsRouter from "./datasets";
import competitionsRouter from "./competitions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gatewaysRouter);
router.use(datasetsRouter);
router.use(competitionsRouter);

export default router;

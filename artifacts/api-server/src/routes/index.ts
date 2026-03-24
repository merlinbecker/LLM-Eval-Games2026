import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionRouter from "./session";
import gatewaysRouter from "./gateways";
import datasetsRouter from "./datasets";
import competitionsRouter from "./competitions";
import logsRouter from "./logs";
import activitiesRouter from "./activities";
import { sessionMiddleware } from "../middlewares/session";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(sessionMiddleware);
router.use(gatewaysRouter);
router.use(datasetsRouter);
router.use(competitionsRouter);
router.use(logsRouter);
router.use(activitiesRouter);

export default router;

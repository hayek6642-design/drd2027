import { Router, type IRouter } from "express";
import healthRouter from "./health";
import zagelRouter from "./zagel";
import geminiRouter from "./gemini";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/zagel", zagelRouter);
router.use("/gemini", geminiRouter);

export default router;

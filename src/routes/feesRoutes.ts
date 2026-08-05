import { Router } from "express";
import { estimateFees } from "../controllers/feesController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// Fee estimates include the professional fee, which is withheld from signed-out
// visitors — so this route requires auth like the rest of the pricing surface.
router.use(authMiddleware as any);

router.post("/estimate", estimateFees as any);

export default router;

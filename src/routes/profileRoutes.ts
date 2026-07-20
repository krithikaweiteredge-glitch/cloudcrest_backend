import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profileController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// Secure all profile settings actions to authenticated customers
router.use(authMiddleware as any);

router.get("/me", getMyProfile as any);
router.put("/me", updateMyProfile as any);

export default router;

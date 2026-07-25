import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profileController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { updateProfileSchema } from "../validators/schemas.js";

const router = Router();

// Secure all profile settings actions to authenticated customers
router.use(authMiddleware as any);

router.get("/me", getMyProfile as any);
router.put("/me", validate(updateProfileSchema), updateMyProfile as any);

export default router;

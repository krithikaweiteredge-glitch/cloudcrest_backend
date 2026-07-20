import { Router } from "express";
import { getMyNotifications, markNotificationAsRead } from "../controllers/notificationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// Secure all endpoints to logged-in customers
router.use(authMiddleware as any);

router.get("/my-notifications", getMyNotifications as any);
router.put("/:id/read", markNotificationAsRead as any);

export default router;

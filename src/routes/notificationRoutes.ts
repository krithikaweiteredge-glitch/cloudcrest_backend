import { Router } from "express";
import { getNotifications, createNotification, markNotificationRead } from "../controllers/notificationController.js";
import { optionalAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// Public & Authenticated Notifications (Guest mode gets broadcasts; Logged-in gets user-specific + broadcasts)
router.get("/", optionalAuth, getNotifications);

// Create Notification (Admin / Internal)
router.post("/", optionalAuth, createNotification);

// Mark Read
router.post("/:id/read", optionalAuth, markNotificationRead);

export default router;

import { Response } from "express";
import { db } from "../config/db.js";
import { notifications } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, and, desc } from "drizzle-orm";

// 1. GET ALL NOTIFICATIONS FOR LOGGED IN USER
export async function getMyNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.id));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Fetch notifications error:", error);
    return res.status(500).json({ error: error.message || "Failed to retrieve notifications" });
  }
}

// 2. MARK SPECIFIC NOTIFICATION AS READ
export async function markNotificationAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const notificationId = parseInt(req.params.id as string, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    // Verify ownership and update
    const notificationCheck = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);

    if (notificationCheck.length === 0) {
      return res.status(404).json({ error: "Notification not found or access denied" });
    }

    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    return res.status(200).json({
      message: "Notification marked as read",
      notification: updatedNotification,
    });
  } catch (error: any) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ error: error.message || "Failed to update notification status" });
  }
}

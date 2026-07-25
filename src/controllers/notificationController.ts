import { Request, Response } from "express";
import { db } from "../config/db.js";
import { notifications } from "../models/schema/notifications.js";
import { serviceRequests } from "../models/schema/serviceRequests.js";
import { eq, or, isNull, desc, and } from "drizzle-orm";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

// Seed the default public broadcasts once, when the table has no rows yet.
async function seedDefaultPublicNotifications() {
  const existing = await db.select().from(notifications).limit(1);
  if (existing.length > 0) return;
  await db.insert(notifications).values([
    {
      userId: null,
      title: "📢 Announcement: MCA Portal Updates 2026",
      message: "Central MCA SPICe+ Part A & B incorporation forms are fully active with automated fee calculation.",
      type: "broadcast",
      linkUrl: "/m/company",
      isRead: "false",
    },
    {
      userId: null,
      title: "💼 Advisory: Free Business Tax Consultation",
      message: "All new company incorporation requests receive complimentary GST & Trademark filing guidance.",
      type: "broadcast",
      linkUrl: "/m/gst",
      isRead: "false",
    },
    {
      userId: null,
      title: "⚡ Desk Notice: Expert Review Online",
      message: "Our CA/CS compliance desk is online. Upload your identity and office documents for fast verification.",
      type: "broadcast",
      linkUrl: "/",
      isRead: "false",
    },
  ]);
}

// 1. GET NOTIFICATIONS (User-specific if logged in + Public broadcasts for everyone)
export async function getNotifications(req: Request, res: Response) {
  try {
    await seedDefaultPublicNotifications();

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    let dbNotifs: any[];
    if (userId) {
      dbNotifs = await db
        .select()
        .from(notifications)
        .where(or(eq(notifications.userId, userId), isNull(notifications.userId)))
        .orderBy(desc(notifications.createdAt));
    } else {
      // Guest mode (Not logged in): Fetch public broadcast notifications sent by admin
      dbNotifs = await db
        .select()
        .from(notifications)
        .where(isNull(notifications.userId))
        .orderBy(desc(notifications.createdAt));
    }

    // If user is logged in, also include user-specific status updates from their service_requests
    let userRequestNotifs: any[] = [];
    if (userId) {
      const userRequests = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.userId, userId))
        .orderBy(desc(serviceRequests.createdAt))
        .limit(5);

      userRequestNotifs = userRequests.map((r) => ({
        id: `req-${r.id}`,
        userId: r.userId,
        title: `Filing Status: ${r.serviceTitle}`,
        message: r.notes
          ? `[Admin Notes]: ${r.notes.split("|")[0].trim()}`
          : `Application ${r.referenceNo} is currently ${r.status.toUpperCase()} by ${r.authority || "MCA"}.`,
        type: "user_update",
        linkUrl: "/profile/requests",
        isRead: "false",
        createdAt: r.createdAt,
        refNo: r.referenceNo,
      }));
    }

    // Merge public broadcasts and user-specific notifications
    const combined = [...userRequestNotifs, ...dbNotifs];

    return res.status(200).json(combined);
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

// 2. CREATE NOTIFICATION (Admin Endpoint)
export async function createNotification(req: Request, res: Response) {
  try {
    const { userId, title, message, type, linkUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const [inserted] = await db
      .insert(notifications)
      .values({
        userId: userId ? Number(userId) : null,
        title,
        message,
        type: type || (userId ? "user_update" : "broadcast"),
        linkUrl: linkUrl || null,
        isRead: "false",
      })
      .returning();

    return res.status(201).json({ message: "Notification created successfully", notification: inserted });
  } catch (error: any) {
    console.error("Create notification error:", error);
    return res.status(500).json({ error: "Failed to create notification" });
  }
}

// 3. MARK NOTIFICATION AS READ
export async function markNotificationRead(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;

    if (id === "all") {
      if (userId) {
        await db
          .update(notifications)
          .set({ isRead: "true" })
          .where(or(eq(notifications.userId, userId), isNull(notifications.userId)));
      } else {
        await db
          .update(notifications)
          .set({ isRead: "true" })
          .where(isNull(notifications.userId));
      }
    } else if (id && !id.startsWith("req-")) {
      const numId = Number(id);
      if (!isNaN(numId)) {
        await db
          .update(notifications)
          .set({ isRead: "true" })
          .where(eq(notifications.id, numId));
      }
    }
    return res.status(200).json({ message: "Notification(s) marked as read" });
  } catch (error: any) {
    console.error("Mark read error:", error);
    return res.status(500).json({ error: "Failed to mark as read" });
  }
}

import { Response } from "express";
import { db } from "../config/db.js";
import {
  users,
  roles,
  orders,
  services,
  estimates,
  businesses,
  orderDocuments,
  notifications,
  activityLogs,
  supportTickets,
  ticketMessages,
} from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, desc } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { logActivity } from "../utils/auditLogger.js";

// 1. LIST ALL REGISTERED USERS
export async function listAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const list = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        roleName: roles.name,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Admin list users error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch users list" });
  }
}

// 2. LIST ALL ORDERS & DETAILS
export async function listAllOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const list = await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        serviceName: services.name,
        total: estimates.total,
        customerName: users.firstName,
        customerEmail: users.email,
        businessName: businesses.businessName,
      })
      .from(orders)
      .leftJoin(services, eq(orders.serviceId, services.id))
      .leftJoin(estimates, eq(orders.id, estimates.orderId))
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(businesses, eq(orders.businessId, businesses.id));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Admin list orders error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch orders list" });
  }
}

// 3. UPDATE ORDER STATUS
export async function updateOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const allowedStatuses = ["pending", "approved", "rejected"];
    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Invalid status. Allowed values: pending, approved, rejected." });
    }

    const targetStatus = status.toLowerCase();

    // Check if order exists
    const orderCheck = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderRecord = orderCheck[0];

    // Update order status in database
    await db
      .update(orders)
      .set({ status: targetStatus })
      .where(eq(orders.id, orderId));

    // Update associated business record status
    if (orderRecord.businessId) {
      await db
        .update(businesses)
        .set({ status: targetStatus })
        .where(eq(businesses.id, orderRecord.businessId));
    }

    // Audit Logging
    if (req.user?.id) {
      await logActivity(req.user.id, `Updated order status to ${targetStatus}`, "orders", orderId);
    }

    return res.status(200).json({
      message: `Order status updated to ${targetStatus} successfully`,
      orderId,
      status: targetStatus,
    });
  } catch (error: any) {
    console.error("Admin update status error:", error);
    return res.status(500).json({ error: error.message || "Failed to update order status" });
  }
}

// 4. DOWNLOAD USER DOCUMENT FILE
export async function downloadUserDocument(req: AuthenticatedRequest, res: Response) {
  try {
    const docId = parseInt(req.params.id as string, 10);
    if (isNaN(docId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    // Find document metadata
    const docMeta = await db
      .select()
      .from(orderDocuments)
      .where(eq(orderDocuments.id, docId))
      .limit(1);

    if (docMeta.length === 0) {
      return res.status(404).json({ error: "Document metadata not found" });
    }

    const doc = docMeta[0];
    const absolutePath = path.resolve(doc.fileUrl);

    // Verify physical file exists on disk
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Physical upload file not found on server" });
    }

    // Audit Logging
    if (req.user?.id) {
      await logActivity(req.user.id, `Downloaded user document file: ${doc.fileName}`, "documents", docId);
    }

    // Return file as direct browser download
    return res.download(absolutePath, doc.fileName);
  } catch (error: any) {
    console.error("Admin file download error:", error);
    return res.status(500).json({ error: error.message || "Failed to stream document download" });
  }
}

// 5. SEND NOTIFICATION TO SPECIFIC USER
export async function sendNotificationToUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, title, message, orderId } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: "Missing required fields: userId, title, and message are required." });
    }

    const targetUserId = parseInt(userId as string, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid target user ID" });
    }

    // Verify target user exists
    const userCheck = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (userCheck.length === 0) {
      return res.status(404).json({ error: `Target user with ID ${targetUserId} does not exist.` });
    }

    // Create the notification record
    const [newNotification] = await db
      .insert(notifications)
      .values({
        userId: targetUserId,
        orderId: orderId ? parseInt(orderId as string, 10) : null,
        title: title.trim(),
        message: message.trim(),
        isRead: false,
      })
      .returning();

    // Audit Logging
    if (req.user?.id) {
      await logActivity(
        req.user.id,
        `Sent notification to customer ID ${targetUserId}: "${title.trim()}"`,
        "notifications",
        newNotification.id
      );
    }

    return res.status(201).json({
      message: "Notification sent successfully",
      notification: newNotification,
    });
  } catch (error: any) {
    console.error("Admin send notification error:", error);
    return res.status(500).json({ error: error.message || "Failed to deliver notification" });
  }
}

// 6. LIST ALL SYSTEM SUPPORT TICKETS
export async function listAllTickets(req: AuthenticatedRequest, res: Response) {
  try {
    const list = await db
      .select({
        id: supportTickets.id,
        customerId: supportTickets.customerId,
        customerName: users.firstName,
        customerEmail: users.email,
        orderId: supportTickets.orderId,
        subject: supportTickets.subject,
        status: supportTickets.status,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.customerId, users.id))
      .orderBy(desc(supportTickets.id));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Admin list tickets error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch tickets list" });
  }
}

// 7. CHANGE SUPPORT TICKET STATUS
export async function updateTicketStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const allowedStatuses = ["pending", "resolved", "closed"];
    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Invalid status. Allowed values: pending, resolved, closed." });
    }

    const targetStatus = status.toLowerCase();

    // Check if ticket exists
    const ticketCheck = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    if (ticketCheck.length === 0) {
      return res.status(404).json({ error: "Support ticket not found" });
    }

    // Update status
    await db
      .update(supportTickets)
      .set({ status: targetStatus })
      .where(eq(supportTickets.id, ticketId));

    // Audit Logging
    if (req.user?.id) {
      await logActivity(req.user.id, `Changed support ticket ID ${ticketId} status to: ${targetStatus}`, "tickets", ticketId);
    }

    return res.status(200).json({
      message: `Ticket status updated to ${targetStatus} successfully`,
      ticketId,
      status: targetStatus,
    });
  } catch (error: any) {
    console.error("Admin ticket status update error:", error);
    return res.status(500).json({ error: error.message || "Failed to update ticket status" });
  }
}

// 8. ADMIN REPLIES TO TICKET AND MARKS AS RESOLVED
export async function replyToTicketAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message content cannot be blank" });
    }

    // Check if ticket exists
    const ticketCheck = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    if (ticketCheck.length === 0) {
      return res.status(404).json({ error: "Support ticket not found" });
    }

    // Insert admin response message
    const [newMessage] = await db
      .insert(ticketMessages)
      .values({
        ticketId,
        senderId: adminId,
        message: message.trim(),
      })
      .returning();

    // Auto-update ticket status to "resolved" as requested
    await db
      .update(supportTickets)
      .set({ status: "resolved" })
      .where(eq(supportTickets.id, ticketId));

    // Audit Logging
    await logActivity(adminId, `Resolved and replied to ticket ID ${ticketId}`, "tickets", ticketId);

    return res.status(201).json({
      message: "Reply sent and ticket resolved successfully",
      reply: newMessage,
      status: "resolved",
    });
  } catch (error: any) {
    console.error("Admin ticket reply error:", error);
    return res.status(500).json({ error: error.message || "Failed to deliver ticket reply" });
  }
}

// 9. LIST ALL AUDIT ACTIVITY LOGS
export async function listActivityLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const list = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userName: users.firstName,
        userEmail: users.email,
        action: activityLogs.action,
        module: activityLogs.module,
        recordId: activityLogs.recordId,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.id));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Admin fetch activity logs error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch activity logs" });
  }
}


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
  activityLogs,
  supportTickets,
  ticketMessages,
  serviceRequests,
  requestDocuments,
} from "../models/schema.js";
// Use the canonical notifications model (type / linkUrl / string isRead) so admin
// notifications are readable by the user-facing notification menu.
import { notifications } from "../models/schema/notifications.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, desc, asc } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { logActivity } from "../utils/auditLogger.js";
import { isRemoteUrl } from "../utils/storage.js";

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
    return res.status(500).json({ error: "Failed to fetch users list" });
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
    return res.status(500).json({ error: "Failed to fetch orders list" });
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
    return res.status(500).json({ error: "Failed to update order status" });
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

    // Audit Logging
    if (req.user?.id) {
      await logActivity(req.user.id, `Downloaded user document file: ${doc.fileName}`, "documents", docId);
    }

    // Blob-stored files are public URLs — redirect to them; local-dev files are
    // streamed from disk.
    if (isRemoteUrl(doc.fileUrl)) {
      return res.redirect(doc.fileUrl);
    }
    const absolutePath = path.resolve(doc.fileUrl);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Physical upload file not found on server" });
    }
    return res.download(absolutePath, doc.fileName);
  } catch (error: any) {
    console.error("Admin file download error:", error);
    return res.status(500).json({ error: "Failed to stream document download" });
  }
}

// 5. SEND NOTIFICATION TO SPECIFIC USER
export async function sendNotificationToUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, title, message, requestId } = req.body;

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

    // If tied to a registration, deep-link the notification to that registration and
    // record the remark on the registration so it shows in the detail modal.
    let linkUrl = "/profile/requests";
    if (requestId) {
      const rid = parseInt(requestId as string, 10);
      if (!isNaN(rid)) {
        const [reqRow] = await db
          .select()
          .from(serviceRequests)
          .where(eq(serviceRequests.id, rid))
          .limit(1);
        if (reqRow) {
          if (reqRow.referenceNo) {
            linkUrl = `/profile/requests?ref=${encodeURIComponent(reqRow.referenceNo)}`;
          }
          const stamp = new Date().toLocaleString("en-IN");
          const remark = `[Admin · ${stamp}] ${message.trim()}`;
          const updatedNotes = reqRow.notes ? `${reqRow.notes}\n\n${remark}` : remark;
          await db
            .update(serviceRequests)
            .set({ notes: updatedNotes })
            .where(eq(serviceRequests.id, rid));
        }
      }
    }

    // Create the notification record (canonical schema so the user's bell can read it)
    const notifValues = {
      userId: targetUserId,
      title: title.trim(),
      message: message.trim(),
      type: "user_update",
      linkUrl,
      isRead: "false",
    };

    const [newNotification] = await db.insert(notifications).values(notifValues).returning();

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
    return res.status(500).json({ error: "Failed to deliver notification" });
  }
}

// 5b. BROADCAST A NOTIFICATION TO ALL USERS
export async function sendBroadcast(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, message, linkUrl } = req.body;
    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: "Title and message are required." });
    }

    const notifValues = {
      userId: null,
      title: title.trim(),
      message: message.trim(),
      type: "broadcast",
      linkUrl: linkUrl && linkUrl.trim() ? linkUrl.trim() : null,
      isRead: "false",
    };

    const [newNotification] = await db.insert(notifications).values(notifValues).returning();

    if (req.user?.id) {
      await logActivity(req.user.id, `Broadcast notification: "${title.trim()}"`, "notifications", newNotification.id);
    }

    return res.status(201).json({ message: "Broadcast sent to all users", notification: newNotification });
  } catch (error: any) {
    console.error("Admin broadcast error:", error);
    return res.status(500).json({ error: "Failed to send broadcast" });
  }
}

// 5c. LIST EVERY NOTIFICATION SENT (broadcasts + user-specific)
export async function listAllNotifications(_req: AuthenticatedRequest, res: Response) {
  try {
    const list = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        linkUrl: notifications.linkUrl,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        recipientName: users.firstName,
        recipientEmail: users.email,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.userId, users.id))
      .orderBy(desc(notifications.createdAt));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Admin list notifications error:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
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
    return res.status(500).json({ error: "Failed to fetch tickets list" });
  }
}

// 6b. GET A SINGLE TICKET WITH ITS FULL MESSAGE THREAD (ADMIN)
export async function getTicketDetailsAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    const [ticket] = await db
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
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({ error: "Support ticket not found" });
    }

    const messages = await db
      .select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        createdAt: ticketMessages.createdAt,
        senderId: ticketMessages.senderId,
        senderName: users.firstName,
        senderRole: roles.name,
      })
      .from(ticketMessages)
      .leftJoin(users, eq(ticketMessages.senderId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.id));

    return res.status(200).json({ ticket, messages });
  } catch (error: any) {
    console.error("Admin get ticket details error:", error);
    return res.status(500).json({ error: "Failed to fetch ticket details" });
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
    return res.status(500).json({ error: "Failed to update ticket status" });
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
    return res.status(500).json({ error: "Failed to deliver ticket reply" });
  }
}

// 9. LIST ALL REGISTRATIONS (SERVICE REQUESTS) WITH OWNING USER
export async function listAllRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const list = await db
      .select({
        id: serviceRequests.id,
        referenceNo: serviceRequests.referenceNo,
        serviceSlug: serviceRequests.serviceSlug,
        serviceTitle: serviceRequests.serviceTitle,
        authority: serviceRequests.authority,
        form: serviceRequests.form,
        status: serviceRequests.status,
        createdAt: serviceRequests.createdAt,
        userId: serviceRequests.userId,
        contactName: serviceRequests.contactName,
        contactEmail: serviceRequests.contactEmail,
        userName: users.firstName,
        userEmail: users.email,
      })
      .from(serviceRequests)
      .leftJoin(users, eq(serviceRequests.userId, users.id))
      .orderBy(desc(serviceRequests.createdAt));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Admin list registrations error:", error);
    return res.status(500).json({ error: "Failed to fetch registrations list" });
  }
}

// 9b. GET A SINGLE REGISTRATION WITH FULL DETAILS + DOCUMENTS + APPLICANT (ADMIN)
export async function getRequestByIdAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const requestId = parseInt(req.params.id as string, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const docs = await db
      .select()
      .from(requestDocuments)
      .where(eq(requestDocuments.requestId, requestId))
      .orderBy(desc(requestDocuments.createdAt));

    let applicant: any = null;
    if (request.userId) {
      const [u] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);
      applicant = u || null;
    }

    return res.status(200).json({ ...request, documents: docs, applicant });
  } catch (error: any) {
    console.error("Admin get registration detail error:", error);
    return res.status(500).json({ error: "Failed to fetch registration details" });
  }
}

// 9c. UPDATE REGISTRATION STATUS (ADMIN)
export async function updateRequestStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user!.id;
    const requestId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid registration ID" });
    }

    const allowedStatuses = ["pending", "processing", "approved", "rejected", "submitted", "in-review", "filed"];
    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        error: "Invalid status. Allowed values: pending, processing, approved, rejected, submitted, in-review, filed.",
      });
    }

    const targetStatus = status.toLowerCase();

    // Check if registration exists
    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Update status
    await db
      .update(serviceRequests)
      .set({ status: targetStatus, updatedAt: new Date().toISOString() })
      .where(eq(serviceRequests.id, requestId));

    // Audit Logging
    await logActivity(adminId, `Updated registration ID ${requestId} (${request.referenceNo}) status to ${targetStatus}`, "requests", requestId);

    // Create notification for applicant
    if (request.userId || request.contactEmail) {
      const statusTitleMap: Record<string, string> = {
        processing: `Registration Processing: ${request.serviceTitle}`,
        approved: `Registration Approved: ${request.serviceTitle}`,
        rejected: `Registration Rejected: ${request.serviceTitle}`,
        pending: `Registration Pending: ${request.serviceTitle}`,
      };

      const statusMsgMap: Record<string, string> = {
        processing: `Your application (${request.referenceNo}) for ${request.serviceTitle} is now under active processing by our associates.`,
        approved: `Great news! Your application (${request.referenceNo}) for ${request.serviceTitle} has been approved by the authority.`,
        rejected: `Your application (${request.referenceNo}) for ${request.serviceTitle} has been marked as rejected. Please check advisor notes or contact support.`,
        pending: `Your application (${request.referenceNo}) for ${request.serviceTitle} is currently pending review.`,
      };

      await db.insert(notifications).values({
        userId: request.userId ? Number(request.userId) : null,
        title: statusTitleMap[targetStatus] || `Registration Status Updated: ${targetStatus}`,
        message: statusMsgMap[targetStatus] || `Status for ${request.referenceNo} changed to ${targetStatus}.`,
        type: "user_update",
        linkUrl: `/profile/requests?ref=${request.referenceNo}`,
        isRead: "false",
      });
    }

    return res.status(200).json({
      message: "Registration status updated successfully",
      status: targetStatus,
    });
  } catch (error: any) {
    console.error("Admin update registration status error:", error);
    return res.status(500).json({ error: "Failed to update registration status" });
  }
}

// 10. LIST ALL AUDIT ACTIVITY LOGS
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
    return res.status(500).json({ error: "Failed to fetch activity logs" });
  }
}


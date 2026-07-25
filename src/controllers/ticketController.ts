import { Response } from "express";
import { db } from "../config/db.js";
import { supportTickets, ticketMessages, users, roles } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, and, asc, desc } from "drizzle-orm";

// 1. CUSTOMER CREATES A NEW SUPPORT TICKET
export async function createTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { subject, message, orderId } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and initial message are required." });
    }

    // Insert the ticket
    const [newTicket] = await db
      .insert(supportTickets)
      .values({
        customerId: userId,
        orderId: orderId ? parseInt(orderId as string, 10) : null,
        subject: subject.trim(),
        status: "pending",
      })
      .returning();

    // Insert the initial message
    await db.insert(ticketMessages).values({
      ticketId: newTicket.id,
      senderId: userId,
      message: message.trim(),
    });

    return res.status(201).json({
      message: "Support ticket created successfully",
      ticket: newTicket,
    });
  } catch (error: any) {
    console.error("Create ticket error:", error);
    return res.status(500).json({ error: "Failed to create support ticket" });
  }
}

// 2. CUSTOMER LISTS ALL THEIR SUPPORT TICKETS
export async function getMyTickets(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const list = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.customerId, userId))
      .orderBy(desc(supportTickets.id));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("List tickets error:", error);
    return res.status(500).json({ error: "Failed to retrieve tickets" });
  }
}

// 3. CUSTOMER VIEWS TICKET DETAILS WITH FULL MESSAGE THREAD
export async function getTicketDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ticketId = parseInt(req.params.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    // Verify ownership
    const ticketCheck = await db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.customerId, userId)))
      .limit(1);

    if (ticketCheck.length === 0) {
      return res.status(404).json({ error: "Ticket not found or access denied" });
    }

    const ticket = ticketCheck[0];

    // Fetch conversation messages joined with sender user details
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

    return res.status(200).json({
      ticket,
      messages,
    });
  } catch (error: any) {
    console.error("Get ticket details error:", error);
    return res.status(500).json({ error: "Failed to fetch ticket conversation details" });
  }
}


import { Response } from "express";
import { db } from "../config/db.js";
import { users, roles, orders, services, estimates, businesses, orderDocuments } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

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

    // Return file as direct browser download
    return res.download(absolutePath, doc.fileName);
  } catch (error: any) {
    console.error("Admin file download error:", error);
    return res.status(500).json({ error: error.message || "Failed to stream document download" });
  }
}

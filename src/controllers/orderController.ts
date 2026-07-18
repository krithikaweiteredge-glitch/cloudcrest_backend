import { Response } from "express";
import { db } from "../config/db.js";
import { businesses, orders, estimates, orderDocuments, documentTypes, services } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, and } from "drizzle-orm";

export async function createOrder(req: AuthenticatedRequest, res: Response) {
  try {
    // req.user is guaranteed to be set by authMiddleware
    const userId = req.user!.id;

    const {
      entityType,
      names,
      mainObjects,
      state,
      city,
      pincode,
      address,
      capital,
      paidUpCapital,
      directorsCount,
      shareholdersCount,
      nominee,
      professionalFee,
      govtFee,
      gst,
      total,
    } = req.body;

    // Validation
    if (!entityType || !names || names.length === 0 || !state || !city || !pincode || !address) {
      return res.status(400).json({ error: "Missing required registration details" });
    }

    // Determine Service ID based on entityType (1 = Company, 2 = LLP)
    const isLLP = entityType.toLowerCase().includes("llp") || entityType.toLowerCase().includes("liability");
    const serviceId = isLLP ? 2 : 1;

    // A. Insert Business
    const primaryName = names[0];
    const newBusinesses = await db
      .insert(businesses)
      .values({
        customerId: userId,
        businessName: primaryName,
        legalName: primaryName,
        entityType: entityType,
        state: state,
        city: city,
        pincode: pincode,
        address: address,
        status: "pending",
      })
      .returning();

    if (newBusinesses.length === 0) {
      throw new Error("Failed to insert business record");
    }
    const businessRecord = newBusinesses[0];

    // B. Generate Order Number: ORD-YYYYMMDD-RAND4
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randStr = Math.floor(1000 + Math.random() * 9000).toString();
    const orderNo = `ORD-${dateStr}-${randStr}`;

    // Insert Order
    const newOrders = await db
      .insert(orders)
      .values({
        orderNo: orderNo,
        customerId: userId,
        businessId: businessRecord.id,
        serviceId: serviceId,
        status: "pending",
        estimatedAmount: String(total || 0),
        finalAmount: String(total || 0),
        paymentStatus: "unpaid",
      })
      .returning();

    if (newOrders.length === 0) {
      throw new Error("Failed to insert order record");
    }
    const orderRecord = newOrders[0];

    // C. Insert Estimate
    await db.insert(estimates).values({
      orderId: orderRecord.id,
      professionalFee: String(professionalFee || 0),
      govtFee: String(govtFee || 0),
      otherFee: "0.00",
      gst: String(gst || 0),
      discount: "0.00",
      total: String(total || 0),
    });

    return res.status(201).json({
      message: "Registration order submitted successfully!",
      order: {
        id: orderRecord.id,
        orderNo: orderRecord.orderNo,
        businessName: businessRecord.businessName,
        estimatedTotal: orderRecord.estimatedAmount,
      },
    });
  } catch (error: any) {
    console.error("Order submission error:", error);
    return res.status(500).json({ error: error.message || "Internal server error submitting order" });
  }
}

// 1. GET CUSTOMER ORDERS
export async function getCustomerOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const list = await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        serviceName: services.name,
        total: estimates.total,
        businessName: businesses.businessName,
      })
      .from(orders)
      .leftJoin(services, eq(orders.serviceId, services.id))
      .leftJoin(estimates, eq(orders.id, estimates.orderId))
      .leftJoin(businesses, eq(orders.businessId, businesses.id))
      .where(eq(orders.customerId, userId));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Get customer orders error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch orders" });
  }
}

// 2. SIMULATE PAYMENT
export async function submitOrderPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Check that order belongs to this customer
    const orderCheck = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)))
      .limit(1);

    if (orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update paymentStatus to 'paid'
    await db
      .update(orders)
      .set({ paymentStatus: "paid" })
      .where(eq(orders.id, orderId));

    return res.status(200).json({ message: "Payment processed successfully" });
  } catch (error: any) {
    console.error("Submit payment error:", error);
    return res.status(500).json({ error: error.message || "Failed to submit payment" });
  }
}

// 3. UPLOAD ORDER DOCUMENTS
export async function uploadOrderDocuments(req: AuthenticatedRequest, res: Response) {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Validate order ownership
    const orderCheck = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)))
      .limit(1);

    if (orderCheck.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderRecord = orderCheck[0];
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const savedDocs = [];

    // Retrieve default document type for this service
    let defaultDocType = await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, orderRecord.serviceId))
      .limit(1);

    let defaultDocTypeId;
    if (defaultDocType.length === 0) {
      const newDocType = await db
        .insert(documentTypes)
        .values({
          serviceId: orderRecord.serviceId,
          name: "General Upload",
          mandatory: false,
        })
        .returning();
      defaultDocTypeId = newDocType[0].id;
    } else {
      defaultDocTypeId = defaultDocType[0].id;
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      let docTypeId = defaultDocTypeId;

      // Extract documentTypeId if passed in req.body.documentTypeIds
      if (req.body.documentTypeIds) {
        const ids = Array.isArray(req.body.documentTypeIds)
          ? req.body.documentTypeIds
          : [req.body.documentTypeIds];
        const parsed = parseInt(ids[i] || ids[0], 10);
        if (!isNaN(parsed)) docTypeId = parsed;
      }

      const inserted = await db
        .insert(orderDocuments)
        .values({
          orderId: orderRecord.id,
          documentTypeId: docTypeId,
          fileName: f.originalname,
          fileUrl: `uploads/${f.filename}`,
          verificationStatus: "pending",
        })
        .returning();

      savedDocs.push(inserted[0]);
    }

    return res.status(201).json({
      message: "Documents uploaded successfully",
      documents: savedDocs,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return res.status(500).json({ error: error.message || "Failed to upload documents" });
  }
}

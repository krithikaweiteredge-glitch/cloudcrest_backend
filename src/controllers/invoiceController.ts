import { Response } from "express";
import { db } from "../config/db.js";
import { orders, users, estimates, services, businesses } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, and } from "drizzle-orm";
import PDFDocument from "pdfkit";

export async function generateInvoicePdf(req: AuthenticatedRequest, res: Response) {
  try {
    const orderId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const isAdmin = req.user!.roleName === "Admin";

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Query order joined with customer, service, estimate, and business
    const orderDetails = await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        createdAt: orders.createdAt,
        paymentStatus: orders.paymentStatus,
        serviceName: services.name,
        customerEmail: users.email,
        customerName: users.firstName,
        businessName: businesses.businessName,
        professionalFee: estimates.professionalFee,
        govtFee: estimates.govtFee,
        gst: estimates.gst,
        total: estimates.total,
      })
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(services, eq(orders.serviceId, services.id))
      .leftJoin(estimates, eq(orders.id, estimates.orderId))
      .leftJoin(businesses, eq(orders.businessId, businesses.id))
      .where(
        isAdmin
          ? eq(orders.id, orderId)
          : and(eq(orders.id, orderId), eq(orders.customerId, userId))
      )
      .limit(1);

    if (orderDetails.length === 0) {
      return res.status(404).json({ error: "Invoice not found or access denied" });
    }

    const order = orderDetails[0];

    // Initialize PDF Document
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set Response Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Invoice-${order.orderNo}.pdf"`);

    // Stream PDF directly to client response
    doc.pipe(res);

    // Design Header Title Block
    doc.fillColor("#1F4E78").fontSize(20).text("CLOUDCREST BUSINESS MANAGEMENT", 50, 50);
    doc.fillColor("#718096").fontSize(8).text("Compliance Desk · India Office", 50, 75);
    doc.fontSize(10).fillColor("#2D3748").text(`INVOICE: ${order.orderNo}`, 400, 50, { align: "right" });
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 400, 65, { align: "right" });
    doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 400, 80, { align: "right" });

    doc.moveDown(3);
    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, 105).lineTo(550, 105).stroke();

    // Bill To Section
    doc.moveDown(1.5);
    doc.fontSize(12).fillColor("#1F4E78").text("Billed To:", 50, 125);
    doc.fontSize(10).fillColor("#2D3748").text(`Name: ${order.customerName}`, 50, 145);
    doc.text(`Email: ${order.customerEmail}`, 50, 160);
    doc.text(`Company Entity: ${order.businessName || "Proposed New Business"}`, 50, 175);

    // Service Ordered
    doc.fontSize(12).fillColor("#1F4E78").text("Service Details:", 320, 125);
    doc.fontSize(10).fillColor("#2D3748").text(`Service: ${order.serviceName || "Incorporation Services"}`, 320, 145);

    doc.moveDown(3);
    doc.strokeColor("#E2E8F0").moveTo(50, 205).lineTo(550, 205).stroke();

    // Table Header
    const tableTop = 230;
    doc.fontSize(10).fillColor("#2C5282");
    doc.text("Description", 50, tableTop);
    doc.text("Amount (INR)", 450, tableTop, { align: "right" });
    doc.strokeColor("#2C5282").lineWidth(1.5).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table Rows
    const proFeeY = tableTop + 30;
    doc.fillColor("#2D3748");
    doc.text("Professional Charges (CA/CS Fee)", 50, proFeeY);
    doc.text(`INR ${parseFloat(order.professionalFee || "0").toFixed(2)}`, 450, proFeeY, { align: "right" });

    const govtFeeY = tableTop + 55;
    doc.text("Government Registrar Filings Fee", 50, govtFeeY);
    doc.text(`INR ${parseFloat(order.govtFee || "0").toFixed(2)}`, 450, govtFeeY, { align: "right" });

    const gstY = tableTop + 80;
    doc.text("Goods and Services Tax (GST @ 18%)", 50, gstY);
    doc.text(`INR ${parseFloat(order.gst || "0").toFixed(2)}`, 450, gstY, { align: "right" });

    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, tableTop + 105).lineTo(550, tableTop + 105).stroke();

    // Total Row
    const totalY = tableTop + 120;
    doc.fontSize(12).fillColor("#1F4E78");
    doc.text("Grand Total", 50, totalY);
    doc.text(`INR ${parseFloat(order.total || "0").toFixed(2)}`, 450, totalY, { align: "right" });

    doc.strokeColor("#1F4E78").lineWidth(1.5).moveTo(50, totalY + 20).lineTo(550, totalY + 20).stroke();

    // Terms / Note
    doc.moveDown(4);
    doc.fontSize(9).fillColor("#718096").text("Notes:", 50, 420);
    doc.text("1. This is a computer-generated invoice and does not require a physical signature.", 50, 440);
    doc.text("2. Filing fee breakdowns are standard and calculated dynamically based on service capital.", 50, 455);
    doc.text("3. For assistance, reach out to operations support at support@cloudcrest.com.", 50, 470);

    // Footer Info
    doc.fontSize(8).fillColor("#A0AEC0").text("Cloudcrest Business Management Private Limited · Compliance & Corporate Secretarial Desk", 50, 720, { align: "center" });

    // End stream
    doc.end();
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate PDF invoice" });
  }
}

import { Response } from "express";
import { db } from "../config/db.js";
import { serviceRequests, requestDocuments } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, and, desc } from "drizzle-orm";
import PDFDocument from "pdfkit";

// 1. CREATE SERVICE REQUEST (SUBMIT FORM)
export async function createServiceRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const {
      serviceSlug,
      serviceTitle,
      authority,
      form,
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      notes,
    } = req.body;

    if (!serviceSlug || !serviceTitle || !contactName || !contactEmail || !contactPhone) {
      return res.status(400).json({ error: "Missing required contact details or service details" });
    }

    // Generate Reference Number: CC-RAND8
    const randStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    const referenceNo = `CC-${randStr}`;

    const [newReq] = await db
      .insert(serviceRequests)
      .values({
        userId,
        serviceSlug,
        serviceTitle,
        authority: authority || null,
        form: form || null,
        businessName: businessName || null,
        contactName,
        contactEmail,
        contactPhone,
        notes: notes || null,
        referenceNo,
        status: "submitted",
      })
      .returning();

    return res.status(201).json(newReq);
  } catch (error: any) {
    console.error("Create service request error:", error);
    return res.status(500).json({ error: error.message || "Failed to submit service request" });
  }
}

// 2. LIST SERVICE REQUESTS FOR LOGGED IN USER
export async function listServiceRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    let query = db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.userId, userId))
      .orderBy(desc(serviceRequests.createdAt));

    if (limit && !isNaN(limit)) {
      query = query.limit(limit) as any;
    }

    const list = await query;
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("List service requests error:", error);
    return res.status(500).json({ error: error.message || "Failed to list registrations" });
  }
}

// 3. UPLOAD DOCUMENTS FOR SERVICE REQUEST
export async function uploadRequestDocument(req: AuthenticatedRequest, res: Response) {
  try {
    const requestId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    // Validate request ownership
    const requestCheck = await db
      .select()
      .from(serviceRequests)
      .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.userId, userId)))
      .limit(1);

    if (requestCheck.length === 0) {
      return res.status(404).json({ error: "Service request not found" });
    }

    // Handle uploaded files
    const files = req.files
      ? (req.files as Express.Multer.File[])
      : req.file
      ? [req.file]
      : [];

    if (files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const savedDocs = [];
    for (const f of files) {
      const [inserted] = await db
        .insert(requestDocuments)
        .values({
          requestId,
          userId,
          name: f.originalname,
          sizeBytes: f.size,
          storagePath: `uploads/${f.filename}`,
          mimeType: f.mimetype,
        })
        .returning();
      savedDocs.push(inserted);
    }

    return res.status(201).json({
      message: "Documents uploaded successfully",
      documents: savedDocs,
    });
  } catch (error: any) {
    console.error("Upload request documents error:", error);
    return res.status(500).json({ error: error.message || "Failed to upload documents" });
  }
}

// 4. LIST ALL DOCUMENTS FOR LOGGED IN USER
export async function listRequestDocuments(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const list = await db
      .select({
        id: requestDocuments.id,
        requestId: requestDocuments.requestId,
        userId: requestDocuments.userId,
        name: requestDocuments.name,
        sizeBytes: requestDocuments.sizeBytes,
        storagePath: requestDocuments.storagePath,
        mimeType: requestDocuments.mimeType,
        createdAt: requestDocuments.createdAt,
        serviceTitle: serviceRequests.serviceTitle,
        referenceNo: serviceRequests.referenceNo,
      })
      .from(requestDocuments)
      .leftJoin(serviceRequests, eq(requestDocuments.requestId, serviceRequests.id))
      .where(eq(requestDocuments.userId, userId))
      .orderBy(desc(requestDocuments.createdAt));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("List request documents error:", error);
    return res.status(500).json({ error: error.message || "Failed to list documents" });
  }
}

// 5. GENERATE SERVICE FILING SUMMARY PDF
export async function generateSummaryPdf(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      title,
      name1,
      name2,
      suffix,
      form,
      directors,
      shareholders,
      capital,
      objects,
      address,
      city,
      state,
      pincode,
      professionalFee,
      mcaFee,
      dscFee,
      stampFee,
      total,
    } = req.body;

    // Initialize PDF Document
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set Response Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Filing-Summary.pdf"');

    // Stream PDF directly to client response
    doc.pipe(res);

    // Design Header Title Block
    doc.fillColor("#1F4E78").fontSize(20).text("CLOUDCREST BUSINESS MANAGEMENT", 50, 50);
    doc.fillColor("#718096").fontSize(8).text("Compliance Desk · Guided Company Filing Report", 50, 75);
    doc.fontSize(10).fillColor("#2D3748").text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 400, 50, { align: "right" });

    doc.moveDown(3);
    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, 105).lineTo(550, 105).stroke();

    // Section 1: Application Details
    doc.moveDown(1.5);
    doc.fontSize(12).fillColor("#1F4E78").text("1. Application Details", 50, 125);
    doc.fontSize(10).fillColor("#2D3748");

    let y = 150;
    const drawRow = (label: string, val: string) => {
      doc.fillColor("#718096").text(label, 50, y);
      doc.fillColor("#2D3748").text(val, 200, y);
      y += 20;
    };

    drawRow("Entity Type:", title || "—");
    drawRow("Proposed Name:", name1 ? `${name1} ${suffix || ""}`.trim() : "—");
    drawRow("Alternate Name:", name2 ? `${name2} ${suffix || ""}`.trim() : "—");
    drawRow("Filing Form:", form || "—");
    drawRow("Directors Count:", String(directors || 0));
    drawRow("Shareholders Count:", String(shareholders || 0));
    drawRow("Authorised Capital:", `INR ${(capital || 0).toLocaleString("en-IN")}`);

    // Main objects needs wrapping
    doc.fillColor("#718096").text("Object / Industry:", 50, y);
    doc.fillColor("#2D3748").text(objects || "—", 200, y, { width: 350 });

    // Calculate new height after objects description block
    const objectsHeight = doc.heightOfString(objects || "—", { width: 350 });
    y += Math.max(25, objectsHeight + 10);

    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 15;

    // Section 2: Registered Office Address
    doc.fontSize(12).fillColor("#1F4E78").text("2. Registered Office Address", 50, y);
    y += 20;
    doc.fontSize(10).fillColor("#2D3748");
    doc.text(`Address: ${address || "—"}`, 50, y, { width: 500 });
    const addressHeight = doc.heightOfString(`Address: ${address || "—"}`, { width: 500 });
    y += Math.max(20, addressHeight + 5);
    doc.text(`City: ${city || "—"}    State: ${state || "—"}    PIN Code: ${pincode || "—"}`, 50, y);

    y += 30;
    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 15;

    // Section 3: Fee Breakdown Table
    doc.fontSize(12).fillColor("#1F4E78").text("3. Estimated Fee Breakdown", 50, y);
    y += 25;

    doc.fontSize(10).fillColor("#2C5282");
    doc.text("Fee Component", 50, y);
    doc.text("Amount (INR)", 450, y, { align: "right" });
    doc.strokeColor("#2C5282").lineWidth(1.5).moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    y += 25;

    const drawTableVal = (label: string, amt: number) => {
      doc.fillColor("#2D3748").text(label, 50, y);
      doc.text(`INR ${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, y, { align: "right" });
      y += 22;
    };

    drawTableVal("Professional CA/CS Fee", Number(professionalFee || 0));
    drawTableVal("MCA Govt. Filing Fee", Number(mcaFee || 0));
    drawTableVal("DSC Fee (Digital Signature Certificates)", Number(dscFee || 0));
    drawTableVal("Stamp Duty (estimated for state)", Number(stampFee || 0));

    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Total Row
    doc.fontSize(12).fillColor("#1F4E78");
    doc.text("Grand Total", 50, y);
    doc.text(`INR ${Number(total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, y, { align: "right" });

    y += 20;
    doc.strokeColor("#1F4E78").lineWidth(1.5).moveTo(50, y).lineTo(550, y).stroke();

    // Notes / Disclaimer
    y += 30;
    doc.fontSize(8).fillColor("#718096").text("Disclaimer / Notes:", 50, y);
    y += 15;
    doc.text("1. This is an estimated summary of cost for incorporation based on user provided data inputs.", 50, y);
    y += 12;
    doc.text("2. Official stamp duties and government fees are subject to state changes and actual capital allocations.", 50, y);

    // Footer Info
    doc.fontSize(8).fillColor("#A0AEC0").text("Cloudcrest Business Management Private Limited · Compliance & Incorporation Desk", 50, 750, { align: "center" });

    doc.end();
  } catch (error: any) {
    console.error("Summary PDF generation error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate PDF summary" });
  }
}

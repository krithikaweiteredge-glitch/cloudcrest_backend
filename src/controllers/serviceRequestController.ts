import { Response } from "express";
import { db } from "../config/db.js";
import { serviceRequests, requestDocuments } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { saveUpload } from "../utils/storage.js";
import { parseFeeContext } from "../config/statutoryFees.js";
import { resolveRequestFees } from "./feesController.js";

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
      authorisedCapital,
      paidCapital,
      notes,
      formData,
      address,
      city,
      state,
      pincode,
      name1,
      name2,
      objects,
      directors,
      shareholders,
      partners,
      fees,
      total,
      // Authoritative fee inputs. When present, the fee is recomputed server-side
      // from these and the catalog price — the client-sent `fees`/`total` are
      // ignored so a tampered client can't file a request with the wrong amount.
      feeContext,
    } = req.body;

    if (!serviceSlug || !serviceTitle || !contactName || !contactEmail || !contactPhone) {
      return res.status(400).json({ error: "Missing required contact details or service details" });
    }

    // Generate Reference Number: CC-RAND8
    const randStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    const referenceNo = `CC-${randStr}`;

    // Build the base form-data object, parsing whatever the client sent.
    let baseFormData: Record<string, any>;
    if (formData) {
      if (typeof formData === "string") {
        try {
          baseFormData = JSON.parse(formData);
        } catch (_) {
          baseFormData = {};
        }
      } else {
        baseFormData = { ...formData };
      }
    } else {
      baseFormData = { address, city, state, pincode, name1, name2, objects, directors, shareholders, partners };
    }

    // Fees are recomputed server-side from the authoritative fee context (never
    // trusting the client's amounts) and snapshotted onto the request, so any
    // summary reprinted later shows the real fees. The snapshot is deliberate —
    // later catalog price changes must not rewrite an already-filed application.
    const ctx = parseFeeContext(feeContext);
    if (ctx) {
      const computed = await resolveRequestFees(ctx);
      baseFormData.fees = computed.lines;
      baseFormData.total = computed.total;
    } else {
      // Non-wizard services (no fee context) still snapshot whatever breakdown
      // they sent — those services price themselves via admin-authored fee lines.
      const feeLines = Array.isArray(fees)
        ? fees
            .filter((f: any) => f && typeof f.label === "string" && f.label.trim())
            .map((f: any) => ({ label: f.label, amount: Number(f.amount) || 0 }))
        : [];
      if (feeLines.length > 0) {
        baseFormData.fees = feeLines;
        baseFormData.total =
          total != null ? Number(total) : feeLines.reduce((sum, l) => sum + l.amount, 0);
      } else if (total != null) {
        baseFormData.total = Number(total);
      }
    }

    const storedFormData = JSON.stringify(baseFormData);

    const insertValues = {
      userId,
      serviceSlug,
      serviceTitle,
      authority: authority || null,
      form: form || null,
      businessName: businessName || null,
      contactName,
      contactEmail,
      contactPhone,
      authorisedCapital: authorisedCapital ? Number(authorisedCapital) : null,
      paidCapital: paidCapital ? Number(paidCapital) : null,
      notes: notes || null,
      formData: storedFormData,
      referenceNo,
      status: "submitted",
    };

    const [newReq] = await db.insert(serviceRequests).values(insertValues).returning();
    return res.status(201).json(newReq);
  } catch (error: any) {
    console.error("Create service request error:", error);
    return res.status(500).json({ error: "Failed to submit service request" });
  }
}

// 2. LIST SERVICE REQUESTS FOR LOGGED IN USER
export async function listServiceRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    let whereCondition = userEmail
      ? or(eq(serviceRequests.userId, userId), eq(serviceRequests.contactEmail, userEmail))
      : eq(serviceRequests.userId, userId);

    let query = db
      .select()
      .from(serviceRequests)
      .where(whereCondition)
      .orderBy(desc(serviceRequests.createdAt));

    if (limit && !isNaN(limit)) {
      query = query.limit(limit) as any;
    }

    const list = await query;

    // Attach documents array to each service request item
    const enrichedList = await Promise.all(
      list.map(async (item) => {
        const docs = await db
          .select()
          .from(requestDocuments)
          .where(eq(requestDocuments.requestId, item.id))
          .orderBy(desc(requestDocuments.createdAt));

        // Surface the snapshotted fee total (stored inside formData) so the
        // orders list shows the real amount rather than a placeholder.
        let total: number | null = null;
        try {
          const fdObj = item.formData ? JSON.parse(item.formData) : null;
          if (fdObj && fdObj.total != null) total = Number(fdObj.total);
        } catch (_) {}

        return {
          ...item,
          total,
          documents: docs,
        };
      })
    );

    return res.status(200).json(enrichedList);
  } catch (error: any) {
    console.error("List service requests error:", error);
    return res.status(500).json({ error: "Failed to list registrations" });
  }
}

// 2b. GET SINGLE SERVICE REQUEST DETAILS WITH DOCUMENTS
export async function getServiceRequestById(req: AuthenticatedRequest, res: Response) {
  try {
    const requestId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const userCheck = userEmail
      ? or(eq(serviceRequests.userId, userId), eq(serviceRequests.contactEmail, userEmail))
      : eq(serviceRequests.userId, userId);

    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(and(eq(serviceRequests.id, requestId), userCheck))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: "Service request not found" });
    }

    const docs = await db
      .select()
      .from(requestDocuments)
      .where(eq(requestDocuments.requestId, requestId))
      .orderBy(desc(requestDocuments.createdAt));

    return res.status(200).json({
      ...request,
      documents: docs,
    });
  } catch (error: any) {
    console.error("Get service request by ID error:", error);
    return res.status(500).json({ error: "Failed to fetch request details" });
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
      const storagePath = await saveUpload(f);
      const [inserted] = await db
        .insert(requestDocuments)
        .values({
          requestId,
          userId,
          name: f.originalname,
          sizeBytes: f.size,
          storagePath,
          mimeType: f.mimetype,
          isVault: "false",
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
    return res.status(500).json({ error: "Failed to upload documents" });
  }
}

// 4. LIST ALL DOCUMENTS FOR LOGGED IN USER (DOCUMENT VAULT ONLY)
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
        isVault: requestDocuments.isVault,
        createdAt: requestDocuments.createdAt,
        serviceTitle: serviceRequests.serviceTitle,
        referenceNo: serviceRequests.referenceNo,
      })
      .from(requestDocuments)
      .leftJoin(serviceRequests, eq(requestDocuments.requestId, serviceRequests.id))
      .where(
        and(
          eq(requestDocuments.userId, userId),
          or(eq(requestDocuments.isVault, "true"), isNull(requestDocuments.requestId))
        )
      )
      .orderBy(desc(requestDocuments.createdAt));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("List request documents error:", error);
    return res.status(500).json({ error: "Failed to list documents" });
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
      // Company limited by guarantee: no share capital, priced off member count.
      liability,
      members,
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
      // Optional: services outside the MCA wizards send their own fee line items
      // and their own subtitle/section labels.
      fees,
      authority,
      documents,
    } = req.body;

    const customFees: { label: string; amount: number }[] = Array.isArray(fees)
      ? fees
          .filter((f: any) => f && typeof f.label === "string")
          .map((f: any) => ({ label: f.label, amount: Number(f.amount || 0) }))
      : [];
    // Two independent choices: which fee rows to draw, and which detail sections
    // to draw. The incorporation wizards now send custom fee lines too, so the
    // layout is decided by whether incorporation fields were supplied.
    const hasCustomFees = customFees.length > 0;
    const isGenericService = !name1 && !capital && !directors;

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

    if (isGenericService) {
      // Non-incorporation services have no name reservation / capital / directors.
      drawRow("Service:", title || "—");
      drawRow("Filing Authority:", authority || "—");
      drawRow("Filing Form:", form || "—");
    } else {
      drawRow("Entity Type:", title || "—");
      drawRow("Proposed Name:", name1 ? `${name1} ${suffix || ""}`.trim() : "—");
      drawRow("Alternate Name:", name2 ? `${name2} ${suffix || ""}`.trim() : "—");
      drawRow("Filing Form:", form || "—");
      if (liability) drawRow("Liability:", String(liability));
      drawRow("Directors Count:", String(directors || 0));
      // A company limited by guarantee has members and no share capital.
      if (members != null && !capital) {
        drawRow("Members Count:", String(members || 0));
      } else {
        drawRow("Shareholders Count:", String(shareholders || 0));
        drawRow("Authorised Capital:", `INR ${(capital || 0).toLocaleString("en-IN")}`);
      }
    }

    if (isGenericService) {
      // Document checklist stands in for the incorporation-specific sections.
      const checklist: string[] = Array.isArray(documents) ? documents.slice(0, 12) : [];
      if (checklist.length > 0) {
        doc.fillColor("#718096").text("Documents Required:", 50, y);
        let dy = y;
        checklist.forEach((d, i) => {
          doc.fillColor("#2D3748").text(`${i + 1}. ${d}`, 200, dy, { width: 350 });
          dy += Math.max(16, doc.heightOfString(`${i + 1}. ${d}`, { width: 350 }) + 4);
        });
        y = dy + 10;
      } else {
        y += 10;
      }
    } else {
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
    }

    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 15;

    // Fee Breakdown Table
    doc.fontSize(12).fillColor("#1F4E78").text(
      `${isGenericService ? "2" : "3"}. Estimated Fee Breakdown`,
      50,
      y
    );
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

    if (hasCustomFees) {
      customFees.forEach((f) => drawTableVal(f.label, f.amount));
    } else {
      drawTableVal("Professional CA/CS Fee", Number(professionalFee || 0));
      drawTableVal("MCA Govt. Filing Fee", Number(mcaFee || 0));
      drawTableVal("DSC Fee (Digital Signature Certificates)", Number(dscFee || 0));
      drawTableVal("Stamp Duty (estimated for state)", Number(stampFee || 0));
    }

    doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Total Row
    doc.fontSize(12).fillColor("#1F4E78");
    doc.text("Grand Total", 50, y);
    doc.text(`INR ${Number(total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, y, { align: "right" });

    y += 20;
    doc.strokeColor("#1F4E78").lineWidth(1.5).moveTo(50, y).lineTo(550, y).stroke();

    // Footer Info
    doc.fontSize(8).fillColor("#A0AEC0").text("Cloudcrest Business Management Private Limited · Compliance & Incorporation Desk", 50, 750, { align: "center" });

    doc.end();
  } catch (error: any) {
    console.error("Summary PDF generation error:", error);
    return res.status(500).json({ error: "Failed to generate PDF summary" });
  }
}

// 5B. DOWNLOAD SERVICE REQUEST FILING SUMMARY PDF BY REQUEST ID
export async function downloadRequestPdfSummaryById(req: AuthenticatedRequest, res: Response) {
  try {
    const requestId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.userId, userId)))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: "Service request not found" });
    }

    const docs = await db
      .select()
      .from(requestDocuments)
      .where(eq(requestDocuments.requestId, requestId));

    let fd: any = {};
    if (request.formData) {
      try {
        fd = typeof request.formData === "string" ? JSON.parse(request.formData) : request.formData;
      } catch (_) {}
    }

    // Create PDF Document
    const pdfDoc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Order-Summary-${request.referenceNo || requestId}.pdf"`
    );

    pdfDoc.pipe(res);

    // Header Title Block
    pdfDoc.fillColor("#1F4E78").fontSize(20).text("CLOUDCREST BUSINESS MANAGEMENT", 50, 50);
    pdfDoc.fillColor("#718096").fontSize(8).text("Compliance & Filing Desk · Registered Order Summary", 50, 75);
    pdfDoc
      .fontSize(10)
      .fillColor("#2D3748")
      .text(`Date: ${new Date(request.createdAt).toLocaleDateString("en-IN")}`, 400, 50, { align: "right" });

    pdfDoc.moveDown(3);
    pdfDoc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, 105).lineTo(550, 105).stroke();

    // Section 1: Order & Service Details
    pdfDoc.moveDown(1.5);
    pdfDoc.fontSize(12).fillColor("#1F4E78").text("1. Registered Order & Filing Details", 50, 125);
    pdfDoc.fontSize(10).fillColor("#2D3748");

    let y = 150;
    const drawRow = (label: string, val: string) => {
      pdfDoc.fillColor("#718096").text(label, 50, y);
      pdfDoc.fillColor("#2D3748").text(val, 200, y);
      y += 20;
    };

    drawRow("Reference No:", request.referenceNo || `REQ-${request.id}`);
    drawRow("Service Title:", request.serviceTitle || "Company Registration");
    drawRow("Authority & Form:", `${request.authority || "MCA"} ${request.form ? `(${request.form})` : ""}`);
    drawRow("Proposed Name 1:", fd.name1 ? `${fd.name1} ${fd.suffix || ""}`.trim() : request.businessName || "—");
    if (fd.name2) drawRow("Proposed Name 2:", fd.name2);
    if (fd.objects) drawRow("Main Objects:", fd.objects);
    if (fd.address) drawRow("Office Address:", `${fd.address}, ${fd.city || ""}, ${fd.state || ""} - ${fd.pincode || ""}`);
    drawRow("Application Status:", (request.status || "PENDING").toUpperCase());
    drawRow("Capital (INR):", `INR ${Number(fd.capital || request.paidCapital || request.authorisedCapital || 100000).toLocaleString("en-IN")}`);

    pdfDoc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 15;

    // Section 2: Contact Information
    pdfDoc.fontSize(12).fillColor("#1F4E78").text("2. Applicant Contact Information", 50, y);
    y += 25;

    drawRow("Contact Name:", request.contactName || "—");
    drawRow("Email Address:", request.contactEmail || "—");
    drawRow("Mobile Number:", request.contactPhone || "—");

    // Section 3: Estimated Fee Breakdown Table
    pdfDoc.fontSize(12).fillColor("#1F4E78").text("3. Estimated Fee Breakdown", 50, y);
    y += 25;

    pdfDoc.fontSize(10).fillColor("#2C5282");
    pdfDoc.text("Fee Component", 50, y);
    pdfDoc.text("Amount (INR)", 450, y, { align: "right" });
    pdfDoc.strokeColor("#2C5282").lineWidth(1.5).moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    y += 25;

    const drawTableVal = (label: string, amt: number) => {
      pdfDoc.fillColor("#2D3748").text(label, 50, y);
      pdfDoc.text(`INR ${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, y, { align: "right" });
      y += 22;
    };

    // Prefer the real fee breakdown snapshotted on the request at submit time.
    // Fall back to the standard estimate only for legacy requests filed before
    // fees were captured.
    const storedFees: { label: string; amount: number }[] = Array.isArray(fd.fees)
      ? fd.fees
          .filter((f: any) => f && typeof f.label === "string")
          .map((f: any) => ({ label: String(f.label), amount: Number(f.amount) || 0 }))
      : [];

    let grandTotal: number;
    if (storedFees.length > 0) {
      storedFees.forEach((f) => drawTableVal(f.label, f.amount));
      grandTotal =
        fd.total != null ? Number(fd.total) : storedFees.reduce((sum, f) => sum + f.amount, 0);
    } else {
      const profFee = 2499;
      const mcaFee = 1000;
      const dscFee = 1500;
      const stampFee = 500;
      grandTotal = profFee + mcaFee + dscFee + stampFee;

      drawTableVal("Professional CA/CS Fee", profFee);
      drawTableVal("MCA Govt. Filing Fee", mcaFee);
      drawTableVal("DSC Fee (Digital Signature Certificates)", dscFee);
      drawTableVal("Stamp Duty (estimated for state)", stampFee);
    }

    pdfDoc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Total Row
    pdfDoc.fontSize(12).fillColor("#1F4E78");
    pdfDoc.text("Grand Total", 50, y);
    pdfDoc.text(`INR ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, y, { align: "right" });

    y += 25;
    pdfDoc.strokeColor("#1F4E78").lineWidth(1.5).moveTo(50, y).lineTo(550, y).stroke();
    y += 20;

    // Section 4: the applicant's own "anything we should know?" remark
    if (request.notes) {
      pdfDoc.fontSize(12).fillColor("#1F4E78").text("4. Note from Applicant", 50, y);
      y += 22;
      pdfDoc.fontSize(9).fillColor("#2D3748").text(request.notes, 50, y, { width: 500 });
      const notesHeight = pdfDoc.heightOfString(request.notes, { width: 500 });
      y += Math.max(25, notesHeight + 15);
      pdfDoc.strokeColor("#E2E8F0").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
      y += 15;
    }

    // Section 5: Attached Documents
    pdfDoc.fontSize(12).fillColor("#1F4E78").text("5. Attached Documents", 50, y);
    y += 25;

    if (docs.length === 0) {
      pdfDoc.fontSize(9).fillColor("#718096").text("No external documents attached.", 50, y);
      y += 20;
    } else {
      docs.forEach((d, idx) => {
        pdfDoc.fontSize(9).fillColor("#2D3748").text(`${idx + 1}. ${d.name}`, 50, y);
        pdfDoc.fillColor("#718096").text(`Uploaded: ${new Date(d.createdAt).toLocaleDateString("en-IN")}`, 400, y, { align: "right" });
        y += 18;
      });
    }

    pdfDoc.fontSize(8).fillColor("#A0AEC0").text("Cloudcrest Business Management Private Limited · Compliance & Incorporation Desk", 50, 750, { align: "center" });

    pdfDoc.end();
  } catch (error: any) {
    console.error("Download request summary PDF error:", error);
    return res.status(500).json({ error: "Failed to generate order summary PDF" });
  }
}

// 6. UPLOAD DIRECTLY TO DOCUMENT VAULT
export async function uploadVaultDocument(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
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
      const storagePath = await saveUpload(f);
      const docValues = {
        requestId: null,
        userId,
        name: f.originalname,
        sizeBytes: f.size,
        storagePath,
        mimeType: f.mimetype,
        isVault: "true",
      };

      const [inserted] = await db.insert(requestDocuments).values(docValues).returning();
      savedDocs.push(inserted);
    }

    return res.status(201).json({
      message: "Uploaded to Document Vault successfully",
      documents: savedDocs,
    });
  } catch (error: any) {
    console.error("Upload vault document error:", error);
    return res.status(500).json({ error: "Failed to upload to Document Vault" });
  }
}

// 7. LINK EXISTING VAULT DOCUMENTS TO SERVICE REQUEST
export async function linkVaultDocuments(req: AuthenticatedRequest, res: Response) {
  try {
    const requestId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const { docIds } = req.body;

    if (!Array.isArray(docIds) || docIds.length === 0) {
      return res.status(200).json({ message: "No vault docs selected" });
    }

    for (const docId of docIds) {
      const [existing] = await db
        .select()
        .from(requestDocuments)
        .where(and(eq(requestDocuments.id, Number(docId)), eq(requestDocuments.userId, userId)))
        .limit(1);

      if (existing) {
        await db.insert(requestDocuments).values({
          requestId,
          userId,
          name: existing.name,
          sizeBytes: existing.sizeBytes,
          storagePath: existing.storagePath,
          mimeType: existing.mimeType,
          isVault: "false",
        });
      }
    }

    return res.status(200).json({ message: "Linked vault documents successfully" });
  } catch (error: any) {
    console.error("Link vault documents error:", error);
    return res.status(500).json({ error: "Failed to link vault documents" });
  }
}

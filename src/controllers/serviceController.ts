import { Request, Response } from "express";
import { db } from "../config/db.js";
import { documentTypes } from "../models/schema.js";
import { eq } from "drizzle-orm";

export async function getServiceDocuments(req: Request, res: Response) {
  try {
    const serviceId = parseInt(req.params.id as string, 10);
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    const checklist = await db
      .select({
        id: documentTypes.id,
        serviceId: documentTypes.serviceId,
        name: documentTypes.name,
        mandatory: documentTypes.mandatory,
      })
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, serviceId));

    return res.status(200).json(checklist);
  } catch (error: any) {
    console.error("Get service documents error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch document checklists",
    });
  }
}

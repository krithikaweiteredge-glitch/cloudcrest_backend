import { Request, Response } from "express";
import { db } from "../config/db.js";
import { documentTypes, services, serviceForms, serviceFields } from "../models/schema.js";
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

export async function listServices(req: Request, res: Response) {
  try {
    const list = await db.select().from(services);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("List services error:", error);
    return res.status(500).json({
      error: error.message || "Failed to list services",
    });
  }
}

export async function getServiceFormSchema(req: Request, res: Response) {
  try {
    const serviceId = parseInt(req.params.id as string, 10);
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    // Find if a form exists for this service
    const formRecord = await db
      .select()
      .from(serviceForms)
      .where(eq(serviceForms.serviceId, serviceId))
      .limit(1);

    if (formRecord.length === 0) {
      return res.status(200).json({
        serviceId,
        form: null,
        fields: [],
      });
    }

    const form = formRecord[0];

    // Fetch all fields for this form
    const fields = await db
      .select()
      .from(serviceFields)
      .where(eq(serviceFields.formId, form.id))
      .orderBy(serviceFields.sortOrder);

    return res.status(200).json({
      serviceId,
      form,
      fields,
    });
  } catch (error: any) {
    console.error("Get service form schema error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch service form schema",
    });
  }
}



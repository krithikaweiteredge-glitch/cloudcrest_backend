import { Request, Response } from "express";
import { db } from "../config/db.js";
import {
  documentTypes,
  services,
  serviceForms,
  serviceFields,
  serviceCategories,
  serviceSubcategories,
} from "../models/schema.js";
import { eq, asc } from "drizzle-orm";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

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
      error: "Failed to fetch document checklists",
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
      error: "Failed to list services",
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
      error: "Failed to fetch service form schema",
    });
  }
}

/**
 * Customer sidebar catalog, grouped by category. Only active services that have
 * been given a slug are listed — a slug is what makes a service addressable at
 * /m/:slug, so unslugged rows would render as dead links.
 */
export async function getPublicCatalog(req: Request, res: Response) {
  try {
    const rows = await db
      .select({
        id: services.id,
        name: services.name,
        shortTitle: services.shortTitle,
        slug: services.slug,
        icon: services.icon,
        authority: services.authority,
        formNo: services.formNo,
        categoryId: serviceCategories.id,
        categoryName: serviceCategories.name,
      })
      .from(services)
      .innerJoin(serviceSubcategories, eq(services.subcategoryId, serviceSubcategories.id))
      .innerJoin(serviceCategories, eq(serviceSubcategories.categoryId, serviceCategories.id))
      .where(eq(services.active, true))
      .orderBy(asc(serviceCategories.id), asc(services.id));

    const groups: { label: string; items: any[] }[] = [];
    const byCategory = new Map<number, { label: string; items: any[] }>();

    for (const row of rows) {
      if (!row.slug) continue;
      let group = byCategory.get(row.categoryId);
      if (!group) {
        group = { label: row.categoryName, items: [] };
        byCategory.set(row.categoryId, group);
        groups.push(group);
      }
      group.items.push({
        slug: row.slug,
        title: row.name,
        short: row.shortTitle || row.name,
        authority: row.authority || "",
        form: row.formNo || "",
        icon: row.icon,
      });
    }

    return res.status(200).json(groups.filter((g) => g.items.length > 0));
  } catch (error: any) {
    console.error("Public catalog error:", error);
    return res.status(500).json({
      error: "Failed to fetch public catalog",
    });
  }
}

export async function getServiceBySlug(req: AuthenticatedRequest, res: Response) {
  try {
    const slug = req.params.slug as string;
    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }
    const [service] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    const documents = await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, service.id));
    const [form] = await db.select().from(serviceForms).where(eq(serviceForms.serviceId, service.id)).limit(1);
    const fields = form
      ? await db.select().from(serviceFields).where(eq(serviceFields.formId, form.id)).orderBy(serviceFields.sortOrder)
      : [];

    // Pricing is only quoted to signed-in customers — strip every fee field
    // (including the admin's custom fee lines) for anonymous visitors so the
    // estimate stays behind the sign-in prompt.
    const { professionalFee, govtFee, gstPercent, feeLines, ...publicService } = service;
    const visibleService = req.user
      ? service
      : (publicService as typeof service);

    return res.status(200).json({ service: visibleService, documents, form: form || null, fields });
  } catch (error: any) {
    console.error("Get service by slug error:", error);
    return res.status(500).json({
      error: "Failed to fetch service",
    });
  }
}





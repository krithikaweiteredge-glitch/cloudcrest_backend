import { Response } from "express";
import { db } from "../config/db.js";
import {
  serviceCategories,
  serviceSubcategories,
  services,
  serviceForms,
  serviceFields,
  documentTypes,
} from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq, asc } from "drizzle-orm";
import { logActivity } from "../utils/auditLogger.js";

// ---------- READ ----------

// Full catalog tree: categories -> subcategories -> services
export async function getCatalog(_req: AuthenticatedRequest, res: Response) {
  try {
    const [cats, subs, svcs] = await Promise.all([
      db.select().from(serviceCategories).orderBy(asc(serviceCategories.id)),
      db.select().from(serviceSubcategories).orderBy(asc(serviceSubcategories.id)),
      db.select().from(services).orderBy(asc(services.id)),
    ]);

    const tree = cats.map((c) => ({
      id: c.id,
      name: c.name,
      subcategories: subs
        .filter((s) => s.categoryId === c.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          services: svcs
            .filter((v) => v.subcategoryId === s.id)
            .map((v) => ({
              id: v.id,
              name: v.name,
              description: v.description,
              professionalFee: v.professionalFee,
              govtFee: v.govtFee,
              gstPercent: v.gstPercent,
              active: v.active,
              slug: v.slug,
              shortTitle: v.shortTitle,
              authority: v.authority,
              formNo: v.formNo,
              icon: v.icon,
              wizardRules: v.wizardRules,
            })),
        })),
    }));

    return res.status(200).json(tree);
  } catch (error: any) {
    console.error("Get catalog error:", error);
    return res.status(500).json({ error: "Failed to load catalog" });
  }
}

// A single service with its document checklist and form fields
export async function getServiceDetail(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid service ID" });

    const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const documents = await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.serviceId, id))
      .orderBy(asc(documentTypes.id));

    const [form] = await db.select().from(serviceForms).where(eq(serviceForms.serviceId, id)).limit(1);
    const fields = form
      ? await db.select().from(serviceFields).where(eq(serviceFields.formId, form.id)).orderBy(asc(serviceFields.sortOrder))
      : [];

    return res.status(200).json({ service, documents, form: form || null, fields });
  } catch (error: any) {
    console.error("Get service detail error:", error);
    return res.status(500).json({ error: "Failed to load service" });
  }
}

// ---------- CATEGORIES ----------

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Category name is required" });
    const [row] = await db.insert(serviceCategories).values({ name: name.trim() }).returning();
    if (req.user?.id) await logActivity(req.user.id, `Created category "${row.name}"`, "catalog", row.id);
    return res.status(201).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to create category" });
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name } = req.body;
    if (isNaN(id) || !name || !name.trim()) return res.status(400).json({ error: "Valid ID and name required" });
    const [row] = await db.update(serviceCategories).set({ name: name.trim() }).where(eq(serviceCategories.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Category not found" });
    return res.status(200).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update category" });
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const children = await db.select().from(serviceSubcategories).where(eq(serviceSubcategories.categoryId, id)).limit(1);
    if (children.length > 0) {
      return res.status(409).json({ error: "Remove or move its subcategories before deleting this category." });
    }
    await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
    return res.status(200).json({ message: "Category deleted" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete category" });
  }
}

// ---------- SUBCATEGORIES ----------

export async function createSubcategory(req: AuthenticatedRequest, res: Response) {
  try {
    const { categoryId, name } = req.body;
    const cid = parseInt(categoryId as string, 10);
    if (isNaN(cid) || !name || !name.trim()) return res.status(400).json({ error: "Category and name required" });
    const [row] = await db.insert(serviceSubcategories).values({ categoryId: cid, name: name.trim() }).returning();
    return res.status(201).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to create subcategory" });
  }
}

export async function updateSubcategory(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name } = req.body;
    if (isNaN(id) || !name || !name.trim()) return res.status(400).json({ error: "Valid ID and name required" });
    const [row] = await db.update(serviceSubcategories).set({ name: name.trim() }).where(eq(serviceSubcategories.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Subcategory not found" });
    return res.status(200).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update subcategory" });
  }
}

export async function deleteSubcategory(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const children = await db.select().from(services).where(eq(services.subcategoryId, id)).limit(1);
    if (children.length > 0) {
      return res.status(409).json({ error: "Remove or move its services before deleting this subcategory." });
    }
    await db.delete(serviceSubcategories).where(eq(serviceSubcategories.id, id));
    return res.status(200).json({ message: "Subcategory deleted" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete subcategory" });
  }
}

// ---------- SERVICES ----------

function feeStr(v: any, fallback = "0"): string {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n.toFixed(2);
}

function slugify(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function createService(req: AuthenticatedRequest, res: Response) {
  try {
    const { subcategoryId, name, description, professionalFee, govtFee, gstPercent, active, slug, shortTitle, authority, formNo, icon, whoCanApply, actsRules, validity, nswsApplied, actsRulesPdfs, tabs, feeLines, wizardRules } = req.body;
    const sid = parseInt(subcategoryId as string, 10);
    if (isNaN(sid) || !name || !name.trim()) return res.status(400).json({ error: "Subcategory and name required" });

    const cleanSlug = slug && slug.trim() ? slugify(slug) : null;
    if (cleanSlug) {
      const taken = await db.select().from(services).where(eq(services.slug, cleanSlug)).limit(1);
      if (taken.length > 0) return res.status(409).json({ error: `Slug "${cleanSlug}" is already in use.` });
    }

    const [row] = await db
      .insert(services)
      .values({
        subcategoryId: sid,
        name: name.trim(),
        description: description?.trim() || null,
        professionalFee: feeStr(professionalFee),
        govtFee: feeStr(govtFee),
        gstPercent: feeStr(gstPercent, "18"),
        active: active === undefined ? true : !!active,
        slug: cleanSlug,
        shortTitle: shortTitle?.trim() || null,
        authority: authority?.trim() || null,
        formNo: formNo?.trim() || null,
        icon: icon?.trim() || null,
        whoCanApply: whoCanApply?.trim() || null,
        actsRules: actsRules?.trim() || null,
        validity: validity?.trim() || null,
        nswsApplied: nswsApplied === undefined ? false : !!nswsApplied,
        actsRulesPdfs: actsRulesPdfs?.trim() || null,
        tabs: tabs?.trim() || null,
        feeLines: feeLines?.trim() || null,
        wizardRules: wizardRules?.trim() || null,
      })
      .returning();
    if (req.user?.id) await logActivity(req.user.id, `Created service "${row.name}"`, "catalog", row.id);
    return res.status(201).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to create service" });
  }
}

export async function updateService(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { name, description, professionalFee, govtFee, gstPercent, active, subcategoryId, slug, shortTitle, authority, formNo, icon, whoCanApply, actsRules, validity, nswsApplied, actsRulesPdfs, tabs, feeLines, wizardRules } = req.body;

    const patch: Record<string, any> = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (description !== undefined) patch.description = description?.trim() || null;
    if (professionalFee !== undefined) patch.professionalFee = feeStr(professionalFee);
    if (govtFee !== undefined) patch.govtFee = feeStr(govtFee);
    if (gstPercent !== undefined) patch.gstPercent = feeStr(gstPercent, "18");
    if (active !== undefined) patch.active = !!active;
    if (subcategoryId !== undefined) patch.subcategoryId = parseInt(subcategoryId as string, 10);
    if (shortTitle !== undefined) patch.shortTitle = shortTitle?.trim() || null;
    if (authority !== undefined) patch.authority = authority?.trim() || null;
    if (formNo !== undefined) patch.formNo = formNo?.trim() || null;
    if (icon !== undefined) patch.icon = icon?.trim() || null;
    if (whoCanApply !== undefined) patch.whoCanApply = whoCanApply?.trim() || null;
    if (actsRules !== undefined) patch.actsRules = actsRules?.trim() || null;
    if (validity !== undefined) patch.validity = validity?.trim() || null;
    if (nswsApplied !== undefined) patch.nswsApplied = !!nswsApplied;
    if (actsRulesPdfs !== undefined) patch.actsRulesPdfs = actsRulesPdfs?.trim() || null;
    if (tabs !== undefined) patch.tabs = tabs?.trim() || null;
    if (feeLines !== undefined) patch.feeLines = feeLines?.trim() || null;
    if (wizardRules !== undefined) patch.wizardRules = wizardRules?.trim() || null;
    if (slug !== undefined) {
      const cleanSlug = slug && slug.trim() ? slugify(slug) : null;
      if (cleanSlug) {
        const taken = await db.select().from(services).where(eq(services.slug, cleanSlug)).limit(1);
        if (taken.length > 0 && taken[0].id !== id) {
          return res.status(409).json({ error: `Slug "${cleanSlug}" is already in use.` });
        }
      }
      patch.slug = cleanSlug;
    }

    const [row] = await db.update(services).set(patch).where(eq(services.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Service not found" });
    if (req.user?.id) await logActivity(req.user.id, `Updated service "${row.name}"`, "catalog", row.id);
    return res.status(200).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update service" });
  }
}

export async function deleteService(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    // Remove children (checklist + form + fields) first, then the service.
    const forms = await db.select().from(serviceForms).where(eq(serviceForms.serviceId, id));
    for (const f of forms) {
      await db.delete(serviceFields).where(eq(serviceFields.formId, f.id));
    }
    await db.delete(serviceForms).where(eq(serviceForms.serviceId, id));
    await db.delete(documentTypes).where(eq(documentTypes.serviceId, id));

    try {
      await db.delete(services).where(eq(services.id, id));
    } catch (fkErr: any) {
      // Referenced elsewhere (e.g. orders / compliance calendar) — deactivate instead.
      await db.update(services).set({ active: false }).where(eq(services.id, id));
      return res.status(200).json({ message: "Service is referenced elsewhere, so it was deactivated instead of deleted." });
    }
    return res.status(200).json({ message: "Service deleted" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete service" });
  }
}

// ---------- DOCUMENT CHECKLIST ----------

export async function addDocumentType(req: AuthenticatedRequest, res: Response) {
  try {
    const serviceId = parseInt(req.params.id as string, 10);
    const { name, mandatory } = req.body;
    if (isNaN(serviceId) || !name || !name.trim()) return res.status(400).json({ error: "Service and name required" });
    const [row] = await db
      .insert(documentTypes)
      .values({ serviceId, name: name.trim(), mandatory: mandatory === undefined ? true : !!mandatory })
      .returning();
    return res.status(201).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to add document" });
  }
}

export async function deleteDocumentType(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(documentTypes).where(eq(documentTypes.id, id));
    return res.status(200).json({ message: "Document removed" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to remove document" });
  }
}

// ---------- FORM FIELDS ----------

export async function addServiceField(req: AuthenticatedRequest, res: Response) {
  try {
    const serviceId = parseInt(req.params.id as string, 10);
    const { label, fieldKey, fieldType, required } = req.body;
    if (isNaN(serviceId) || !label?.trim() || !fieldKey?.trim()) {
      return res.status(400).json({ error: "Service, label and field key are required" });
    }

    // Ensure a form exists for this service (auto-create the first time).
    let [form] = await db.select().from(serviceForms).where(eq(serviceForms.serviceId, serviceId)).limit(1);
    if (!form) {
      [form] = await db.insert(serviceForms).values({ serviceId, name: "Default Form", version: 1 }).returning();
    }

    const existing = await db.select().from(serviceFields).where(eq(serviceFields.formId, form.id));
    const [row] = await db
      .insert(serviceFields)
      .values({
        formId: form.id,
        label: label.trim(),
        fieldKey: fieldKey.trim(),
        fieldType: (fieldType || "text").trim(),
        required: !!required,
        stepName: req.body.stepName?.trim() || null,
        options: req.body.options?.trim() || null,
        sortOrder: existing.length + 1,
      })
      .returning();
    return res.status(201).json(row);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to add field" });
  }
}

export async function deleteServiceField(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(serviceFields).where(eq(serviceFields.id, id));
    return res.status(200).json({ message: "Field removed" });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to remove field" });
  }
}

export async function bulkSaveServiceFields(req: AuthenticatedRequest, res: Response) {
  try {
    const serviceId = parseInt(req.params.id as string, 10);
    const { fields } = req.body;
    if (isNaN(serviceId) || !Array.isArray(fields)) {
      return res.status(400).json({ error: "Service ID and fields array are required" });
    }

    let [form] = await db.select().from(serviceForms).where(eq(serviceForms.serviceId, serviceId)).limit(1);
    if (!form) {
      [form] = await db.insert(serviceForms).values({ serviceId, name: "Default Form", version: 1 }).returning();
    }

    // Delete old fields
    await db.delete(serviceFields).where(eq(serviceFields.formId, form.id));

    // Bulk insert new ones
    if (fields.length > 0) {
      await db.insert(serviceFields).values(
        fields.map((f, i) => ({
          formId: form.id,
          label: String(f.label).trim(),
          fieldKey: String(f.fieldKey).trim(),
          fieldType: String(f.fieldType || "text").trim(),
          required: !!f.required,
          stepName: f.stepName?.trim() || null,
          options: f.options?.trim() || null,
          sortOrder: i + 1,
        }))
      );
    }

    return res.status(200).json({ message: "Fields saved successfully" });
  } catch (error: any) {
    console.error("Bulk save fields error:", error);
    return res.status(500).json({ error: "Failed to save fields" });
  }
}

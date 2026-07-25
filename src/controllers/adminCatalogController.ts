import { Request, Response } from "express";
import { db } from "../config/db.js";
import { serviceCategories, serviceSubcategories, services } from "../models/schema.js";
import { eq, asc } from "drizzle-orm";
import { saveUpload } from "../utils/storage.js";

// Reuse the same logic as public catalog but expose via admin route
export async function getFullCatalog(_req: Request, res: Response) {
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
          // Return the full service row so the edit dialog can pre-fill every
          // field it manages — fee lines, page tabs, acts PDFs, etc. — instead of
          // opening blank on fields the summary list didn't include.
          services: svcs.filter((v) => v.subcategoryId === s.id),
        })),
    }));

    return res.status(200).json(tree);
  } catch (error: any) {
    console.error("Admin catalog error:", error);
    return res.status(500).json({ error: "Failed to fetch admin catalog" });
  }
}

// Upload PDF for Acts & Rules - used by admin service dialog
export async function uploadActsPdf(req: Request, res: Response) {
  // multer (memory storage) puts the buffer on req.file
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const url = await saveUpload(file);
  return res.status(201).json({ name: file.originalname, url });
}

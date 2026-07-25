import { Router } from "express";
import {
  getServiceDocuments,
  listServices,
  getServiceFormSchema,
  getPublicCatalog,
  getServiceBySlug,
} from "../controllers/serviceController.js";
import { optionalAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// Public catalog used by the customer sidebar / module pages
router.get("/catalog", getPublicCatalog);
// optionalAuth so the handler can withhold pricing from signed-out visitors
// without blocking the rest of the service details.
router.get("/slug/:slug", optionalAuth as any, getServiceBySlug as any);

router.get("/", listServices);
router.get("/:id/documents", getServiceDocuments);
router.get("/:id/form", getServiceFormSchema as any);

export default router;

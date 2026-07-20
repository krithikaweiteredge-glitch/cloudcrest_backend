import { Router } from "express";
import { getServiceDocuments, listServices, getServiceFormSchema } from "../controllers/serviceController.js";

const router = Router();

router.get("/", listServices);
router.get("/:id/documents", getServiceDocuments);
router.get("/:id/form", getServiceFormSchema as any);

export default router;

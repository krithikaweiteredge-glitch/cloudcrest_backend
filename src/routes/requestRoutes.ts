import { Router } from "express";
import {
  createServiceRequest,
  listServiceRequests,
  getServiceRequestById,
  downloadRequestPdfSummaryById,
  uploadRequestDocument,
  listRequestDocuments,
  generateSummaryPdf,
  uploadVaultDocument,
  linkVaultDocuments,
} from "../controllers/serviceRequestController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multer.js";
import { validate } from "../middlewares/validate.js";
import { createServiceRequestSchema } from "../validators/schemas.js";

const router = Router();

// Secure all routes under /api/requests with auth middleware
router.use(authMiddleware as any);

router.post("/", validate(createServiceRequestSchema), createServiceRequest as any);
router.get("/", listServiceRequests as any);
router.get("/documents", listRequestDocuments as any);
router.get("/:id", getServiceRequestById as any);
router.get("/:id/pdf", downloadRequestPdfSummaryById as any);
router.post("/vault", upload.array("file"), uploadVaultDocument as any);
router.post("/:id/documents", upload.single("file"), uploadRequestDocument as any);
router.post("/:id/link-vault-docs", linkVaultDocuments as any);
router.post("/summary/pdf", generateSummaryPdf as any);

export default router;

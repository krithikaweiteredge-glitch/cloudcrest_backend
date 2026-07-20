import { Router } from "express";
import {
  createServiceRequest,
  listServiceRequests,
  uploadRequestDocument,
  listRequestDocuments,
  generateSummaryPdf,
} from "../controllers/serviceRequestController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

// Secure all routes under /api/requests with auth middleware
router.use(authMiddleware as any);

router.post("/", createServiceRequest as any);
router.get("/", listServiceRequests as any);
router.post("/:id/documents", upload.single("file"), uploadRequestDocument as any);
router.get("/documents", listRequestDocuments as any);
router.post("/summary/pdf", generateSummaryPdf as any);

export default router;

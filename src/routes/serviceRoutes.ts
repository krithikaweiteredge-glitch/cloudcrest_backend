import { Router } from "express";
import { getServiceDocuments } from "../controllers/serviceController.js";

const router = Router();

router.get("/:id/documents", getServiceDocuments);

export default router;

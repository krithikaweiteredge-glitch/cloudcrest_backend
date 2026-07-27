import { Router } from "express";
import { getFullCatalog, uploadActsPdf } from "../controllers/adminCatalogController.js";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  createService,
  updateService,
  deleteService,
  getServiceDetail,
  addDocumentType,
  deleteDocumentType,
  addServiceField,
  deleteServiceField,
  bulkSaveServiceFields,
} from "../controllers/catalogController.js";
import {
  listAllUsers,
  listAllOrders,
  updateOrderStatus,
  downloadUserDocument,
  sendNotificationToUser,
  sendBroadcast,
  listAllNotifications,
  listAllTickets,
  getTicketDetailsAdmin,
  updateTicketStatus,
  replyToTicketAdmin,
  listActivityLogs,
  listAllRequests,
  getRequestByIdAdmin,
  updateRequestStatus,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { upload } from "../middlewares/multer.js";
import { validate } from "../middlewares/validate.js";
import {
  categorySchema,
  subcategorySchema,
  createServiceSchema,
  updateServiceSchema,
  documentTypeSchema,
  sendNotificationSchema,
} from "../validators/schemas.js";

const router = Router();

// Force both auth cookies checks and Admin role verifications on all endpoints
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

router.get("/users", listAllUsers as any);
router.get("/orders", listAllOrders as any);
router.put("/orders/:id/status", updateOrderStatus as any);
router.get("/documents/:id/download", downloadUserDocument as any);
router.get("/notifications", listAllNotifications as any);
router.post("/notifications", validate(sendNotificationSchema), sendNotificationToUser as any);
router.post("/broadcast", sendBroadcast as any);
router.get("/tickets", listAllTickets as any);
router.get("/tickets/:id", getTicketDetailsAdmin as any);
router.put("/tickets/:id/status", updateTicketStatus as any);
router.post("/tickets/:id/messages", replyToTicketAdmin as any);
router.get("/activity-logs", listActivityLogs as any);
// Registration (service request) routes
router.get("/requests", listAllRequests as any);
router.get("/requests/:id", getRequestByIdAdmin as any);
router.put("/requests/:id/status", updateRequestStatus as any);

// Admin catalog routes. The catalog panel addresses everything under
// /catalog/*, so the whole tree — categories, subcategories, services,
// document checklists and form fields — is mounted here.
router.get("/catalog", getFullCatalog as any);
router.post("/catalog/upload", upload.single("file"), uploadActsPdf as any);

router.post("/catalog/categories", validate(categorySchema), createCategory as any);
router.put("/catalog/categories/:id", validate(categorySchema), updateCategory as any);
router.delete("/catalog/categories/:id", deleteCategory as any);

router.post("/catalog/subcategories", validate(subcategorySchema), createSubcategory as any);
router.put("/catalog/subcategories/:id", validate(categorySchema), updateSubcategory as any);
router.delete("/catalog/subcategories/:id", deleteSubcategory as any);

router.post("/catalog/services", validate(createServiceSchema), createService as any);
router.get("/catalog/services/:id", getServiceDetail as any);
router.put("/catalog/services/:id", validate(updateServiceSchema), updateService as any);
router.delete("/catalog/services/:id", deleteService as any);

router.post("/catalog/services/:id/documents", validate(documentTypeSchema), addDocumentType as any);
router.delete("/catalog/documents/:id", deleteDocumentType as any);

router.post("/catalog/services/:id/fields", addServiceField as any);
router.put("/catalog/services/:id/fields", bulkSaveServiceFields as any);
router.delete("/catalog/fields/:id", deleteServiceField as any);

// Service management routes (admin)
router.post("/services", createService as any);
router.get("/services/:id", getServiceDetail as any);
router.put("/services/:id", updateService as any);
router.delete("/services/:id", deleteService as any);

// Document checklist routes
router.post("/services/:id/documents", addDocumentType as any);
router.delete("/documents/:id", deleteDocumentType as any);

// Form field routes
router.post("/services/:id/fields", addServiceField as any);
router.delete("/fields/:id", deleteServiceField as any);
router.put("/services/:id/fields", bulkSaveServiceFields as any);

export default router;

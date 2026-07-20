import { Router } from "express";
import {
  createOrder,
  getCustomerOrders,
  submitOrderPayment,
  uploadOrderDocuments,
  getCustomerOrderDetails,
} from "../controllers/orderController.js";
import { generateInvoicePdf } from "../controllers/invoiceController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

// Secure all routes with authentication middleware
router.use(authMiddleware as any);

router.post("/", createOrder as any);
router.get("/my-orders", getCustomerOrders as any);
router.get("/:id", getCustomerOrderDetails as any);
router.post("/:id/payment", submitOrderPayment as any);
router.post("/:id/documents", upload.array("files", 10), uploadOrderDocuments as any);
router.get("/:id/invoice/pdf", generateInvoicePdf as any);

export default router;

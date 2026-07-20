import { Router } from "express";
import {
  listAllUsers,
  listAllOrders,
  updateOrderStatus,
  downloadUserDocument,
  sendNotificationToUser,
  listAllTickets,
  updateTicketStatus,
  replyToTicketAdmin,
  listActivityLogs,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();

// Force both auth cookies checks and Admin role verifications on all endpoints
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

router.get("/users", listAllUsers as any);
router.get("/orders", listAllOrders as any);
router.put("/orders/:id/status", updateOrderStatus as any);
router.get("/documents/:id/download", downloadUserDocument as any);
router.post("/notifications", sendNotificationToUser as any);
router.get("/tickets", listAllTickets as any);
router.put("/tickets/:id/status", updateTicketStatus as any);
router.post("/tickets/:id/messages", replyToTicketAdmin as any);
router.get("/activity-logs", listActivityLogs as any);

export default router;

import { Router } from "express";
import authRoutes from "./authRoutes.js";
import orderRoutes from "./orderRoutes.js";
import serviceRoutes from "./serviceRoutes.js";
import adminRoutes from "./adminRoutes.js";
import mcaRoutes from "./mcaRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import ticketRoutes from "./ticketRoutes.js";
import profileRoutes from "./profileRoutes.js";
import requestRoutes from "./requestRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/orders", orderRoutes);
router.use("/services", serviceRoutes);
router.use("/admin", adminRoutes);
router.use("/mca", mcaRoutes);
router.use("/notifications", notificationRoutes);
router.use("/tickets", ticketRoutes);
router.use("/profiles", profileRoutes);
router.use("/requests", requestRoutes);

export default router;


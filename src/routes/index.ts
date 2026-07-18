import { Router } from "express";
import authRoutes from "./authRoutes.js";
import orderRoutes from "./orderRoutes.js";
import serviceRoutes from "./serviceRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/orders", orderRoutes);
router.use("/services", serviceRoutes);
router.use("/admin", adminRoutes);

export default router;

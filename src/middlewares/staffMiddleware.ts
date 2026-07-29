import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware.js";

// Roles allowed into the operations console (registrations, tickets, notifications).
// Admins additionally get catalog + employee management, which is gated separately
// by adminMiddleware.
const STAFF_ROLES = ["Admin", "Coordinator"];

export function staffMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please log in first." });
  }

  if (!req.user.roleName || !STAFF_ROLES.includes(req.user.roleName)) {
    return res.status(403).json({ error: "Access denied. Staff privileges required." });
  }

  next();
}

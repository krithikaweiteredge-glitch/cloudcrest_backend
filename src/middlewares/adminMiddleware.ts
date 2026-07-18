import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware.js";

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please log in first." });
  }

  // Double check that user is an Admin
  if (req.user.roleName !== "Admin") {
    return res.status(403).json({ error: "Access denied. Admin privileges required." });
  }

  next();
}

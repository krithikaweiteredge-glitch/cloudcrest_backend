import { Request, Response, NextFunction } from "express";
import { getAuthenticatedUser } from "../utils/auth.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    roleId: number | null;
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    status: string | null;
    createdAt: Date;
    roleName: string | null;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const cookiesHeader = req.headers.cookie || "";
    const user = await getAuthenticatedUser(cookiesHeader);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const cookiesHeader = req.headers.cookie || "";
    const user = await getAuthenticatedUser(cookiesHeader);
    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
}

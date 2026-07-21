import { Request, Response } from "express";
import { db } from "../config/db.js";
import { users, roles } from "../models/schema.js";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  createSessionToken,
} from "../utils/auth.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

// 1. REGISTER
export async function registerUser(req: Request, res: Response) {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if email already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Get default role (Customer)
    const roleList = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "Customer"))
      .limit(1);

    const defaultRoleId = roleList[0]?.id || 1;
    const finalRoleName = roleList[0]?.name || "Customer";

    // Insert user
    const newUsers = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        roleId: defaultRoleId,
        status: "active",
      })
      .returning();

    const createdUser = newUsers[0];

    // Generate token
    const token = await createSessionToken({
      userId: createdUser.id,
      email: createdUser.email,
      roleId: createdUser.roleId,
      roleName: finalRoleName,
    });

    // Set secure cookie
    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days in ms
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: createdUser.id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        phone: createdUser.phone,
        roleId: createdUser.roleId,
        roleName: finalRoleName,
        status: createdUser.status,
        createdAt: createdUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error during registration",
    });
  }
}

// 2. LOGIN
export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Fetch user with role name
    const userList = await db
      .select({
        id: users.id,
        roleId: users.roleId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        passwordHash: users.passwordHash,
        status: users.status,
        createdAt: users.createdAt,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email))
      .limit(1);

    if (userList.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userList[0];

    // Check status
    if (user.status !== "active") {
      return res.status(403).json({ error: "This account has been deactivated" });
    }

    // Compare password
    const isPasswordMatch = await comparePassword(password, user.passwordHash);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate session token
    const finalRoleName = user.roleName || "Customer";
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: finalRoleName,
    });

    // Prepare user details (excluding password hash)
    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      roleName: finalRoleName,
      status: user.status,
      createdAt: user.createdAt,
    };

    // Set secure cookie
    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days in ms
    });

    return res.status(200).json({
      message: "Logged in successfully",
      user: userResponse,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error during login",
    });
  }
}

// 3. LOGOUT
export function logoutUser(req: Request, res: Response) {
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  res.clearCookie("auth_token", {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  return res.status(200).json({ message: "Logged out successfully" });
}

// 4. ME / GET CURRENT USER
export function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  // If user passed the authMiddleware, req.user is guaranteed to exist
  return res.status(200).json({ user: req.user });
}

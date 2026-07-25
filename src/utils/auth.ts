import * as jose from "jose";
import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import { users, roles } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

// Hashing Utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Session Token Utilities
export async function createSessionToken(payload: {
  userId: number;
  email: string;
  roleId: number | null;
  roleName: string;
}): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as {
      userId: number;
      email: string;
      roleId: number | null;
      roleName: string;
    };
  } catch (error) {
    return null;
  }
}

// Cookie Utilities
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split("=");
    if (key) {
      cookies[key.trim()] = decodeURIComponent(valueParts.join("=").trim());
    }
  }
  return cookies;
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    path?: string;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
  } = {}
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`;
  }
  if (options.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (options.path) {
    cookie += `; Path=${options.path}`;
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }
  if (options.secure) {
    cookie += "; Secure";
  }
  return cookie;
}

// Helper to authenticate request
export async function getAuthenticatedUser(cookieHeader: string | null) {
  try {
    const cookies = parseCookies(cookieHeader);
    const token = cookies.auth_token;

    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) return null;

    // Fetch fresh user data from DB to verify existence and role
    const userList = await db
      .select({
        id: users.id,
        roleId: users.roleId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (userList.length === 0) return null;

    const user = userList[0];
    if (user.status !== "active") return null;

    return user;
  } catch (error) {
    console.error("Error in getAuthenticatedUser:", error);
    return null;
  }
}

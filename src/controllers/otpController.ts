import { Request, Response } from "express";
import { db } from "../config/db.js";
import { otps, users, roles } from "../models/schema.js";
import { eq, and, gt } from "drizzle-orm";
import { sendOtpEmail } from "../utils/email.js";
import { createSessionToken } from "../utils/auth.js";

// 1. SEND EMAIL OTP
export async function sendOtp(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    // Generate secure 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Clean up any old OTPs for this email first
    await db.delete(otps).where(eq(otps.emailOrPhone, email));

    // Store new OTP in database
    await db.insert(otps).values({
      emailOrPhone: email,
      code,
      expiresAt,
    });

    // Send code via Nodemailer (or log to terminal as fallback)
    const emailSent = await sendOtpEmail(email, code);

    if (!emailSent) {
      console.warn(`[SMTP Warning] Failed to deliver OTP email to ${email}. Fallback: Code is ${code}`);
    }

    return res.status(200).json({ message: "Verification code sent successfully" });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error while sending OTP",
    });
  }
}

// 2. VERIFY EMAIL OTP
export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    // Find a matching, unexpired OTP code
    const validOtps = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.emailOrPhone, email),
          eq(otps.code, code),
          gt(otps.expiresAt, new Date())
        )
      )
      .limit(1);

    if (validOtps.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    // Delete used OTP
    await db.delete(otps).where(eq(otps.emailOrPhone, email));

    // Check if user exists in our local PostgreSQL database
    let userList = await db
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
      .where(eq(users.email, email))
      .limit(1);

    let loggedInUser;
    let isNewUser = false;

    if (userList.length === 0) {
      // Automatic sign-up: Create user record on first successful login
      isNewUser = true;

      // Get Customer role ID
      const customerRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Customer"))
        .limit(1);
      
      const defaultRoleId = customerRole[0]?.id || 1;
      const roleName = customerRole[0]?.name || "Customer";

      const defaultFirstName = email.split("@")[0];

      const newUsers = await db
        .insert(users)
        .values({
          firstName: defaultFirstName,
          email,
          passwordHash: "OTP_VERIFIED_USER", // Placeholder for compatibility
          roleId: defaultRoleId,
          status: "active",
        })
        .returning();

      const createdUser = newUsers[0];
      loggedInUser = {
        ...createdUser,
        roleName,
      };
    } else {
      loggedInUser = userList[0];
    }

    // Verify status is active
    if (loggedInUser.status !== "active") {
      return res.status(403).json({ error: "This account has been deactivated" });
    }

    // Sign session token
    const token = await createSessionToken({
      userId: loggedInUser.id,
      email: loggedInUser.email,
      roleId: loggedInUser.roleId,
      roleName: loggedInUser.roleName || "Customer",
    });

    // Set HTTP-only secure cookie
    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return res.status(200).json({
      message: isNewUser ? "Account created and logged in successfully" : "Logged in successfully",
      user: {
        id: loggedInUser.id,
        firstName: loggedInUser.firstName,
        lastName: loggedInUser.lastName,
        email: loggedInUser.email,
        phone: loggedInUser.phone,
        roleId: loggedInUser.roleId,
        roleName: loggedInUser.roleName || "Customer",
        status: loggedInUser.status,
        createdAt: loggedInUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error during OTP verification",
    });
  }
}

// 3. FIREBASE PHONE AUTHENTICATION LOGIN
import { verifyFirebaseToken } from "../utils/firebase.js";

export async function firebaseLogin(req: Request, res: Response) {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ error: "Firebase ID token is required" });
    }

    const payload = await verifyFirebaseToken(firebaseToken);
    if (!payload || !payload.phoneNumber) {
      return res.status(400).json({ error: "Invalid or expired Firebase verification token" });
    }

    const phone = payload.phoneNumber;

    // Check if user already exists with this phone number
    let userList = await db
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
      .where(eq(users.phone, phone))
      .limit(1);

    let loggedInUser;
    let isNewUser = false;

    if (userList.length === 0) {
      // If user does not exist by phone, generate placeholder email to satisfy DB non-null constraints
      const emailPlaceholder = `phone_${phone.replace(/\+/g, "")}@mobile-otp.cloudcrest.com`;

      const emailCheck = await db.select().from(users).where(eq(users.email, emailPlaceholder)).limit(1);
      if (emailCheck.length > 0) {
        return res.status(400).json({ error: "A user account with this phone already exists under a conflicting email" });
      }

      isNewUser = true;

      // Get Customer role ID
      const customerRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Customer"))
        .limit(1);

      const defaultRoleId = customerRole[0]?.id || 1;
      const roleName = customerRole[0]?.name || "Customer";
      const defaultFirstName = `User_${phone.slice(-4)}`;

      const newUsers = await db
        .insert(users)
        .values({
          firstName: defaultFirstName,
          email: emailPlaceholder,
          phone: phone,
          passwordHash: "FIREBASE_VERIFIED_USER",
          roleId: defaultRoleId,
          status: "active",
        })
        .returning();

      loggedInUser = {
        ...newUsers[0],
        roleName,
      };
    } else {
      loggedInUser = userList[0];
    }

    if (loggedInUser.status !== "active") {
      return res.status(403).json({ error: "This account has been deactivated" });
    }

    // Sign session token
    const token = await createSessionToken({
      userId: loggedInUser.id,
      email: loggedInUser.email,
      roleId: loggedInUser.roleId,
      roleName: loggedInUser.roleName || "Customer",
    });

    // Set cookie
    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return res.status(200).json({
      message: isNewUser ? "Account created and logged in successfully" : "Logged in successfully",
      user: {
        id: loggedInUser.id,
        firstName: loggedInUser.firstName,
        lastName: loggedInUser.lastName,
        email: loggedInUser.email,
        phone: loggedInUser.phone,
        roleId: loggedInUser.roleId,
        roleName: loggedInUser.roleName || "Customer",
        status: loggedInUser.status,
        createdAt: loggedInUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Firebase login error:", error);
    return res.status(500).json({ error: error.message || "Failed to authenticate via Firebase token" });
  }
}

import { Response } from "express";
import { db } from "../config/db.js";
import { users, businesses } from "../models/schema.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { eq } from "drizzle-orm";

// 1. GET LOGGED IN USER PROFILE WITH BILLING DETAILS
export async function getMyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch user details
    const userCheck = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userCheck.length === 0) {
      return res.status(404).json({ error: "User account not found" });
    }

    const user = userCheck[0];

    // Fetch associated business profile billing details
    const myBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.customerId, userId));

    return res.status(200).json({
      user,
      businesses: myBusinesses,
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: error.message || "Failed to retrieve profile details" });
  }
}

// 2. UPDATE ACCOUNT DETAILS & BILLING SETTINGS
export async function updateMyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      firstName,
      lastName,
      phone,
      businessName,
      legalName,
      gstin,
      pan,
      state,
      city,
      pincode,
      address,
    } = req.body;

    // A. Update user contact details
    const updateData: Partial<typeof users.$inferInsert> = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    let updatedUser = null;
    if (Object.keys(updateData).length > 0) {
      const [usr] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
        });
      updatedUser = usr;
    } else {
      // If no updates, just fetch current user
      const current = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      updatedUser = current[0];
    }

    // B. Create or update billing business details
    let updatedOrCreatedBusiness = null;
    const hasBillingUpdates =
      businessName || legalName || gstin || pan || state || city || pincode || address;

    if (hasBillingUpdates) {
      const existingBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.customerId, userId))
        .limit(1);

      const businessData = {
        customerId: userId,
        businessName: (businessName || updatedUser.firstName + " Billing Profile").trim(),
        legalName: (legalName || businessName || "").trim(),
        gstin: (gstin || "").trim(),
        pan: (pan || "").trim(),
        state: (state || "").trim(),
        city: (city || "").trim(),
        pincode: (pincode || "").trim(),
        address: (address || "").trim(),
        entityType: "Proprietorship / Individual",
        status: "active",
      };

      if (existingBusinesses.length > 0) {
        // Update the existing profile
        const [updatedBus] = await db
          .update(businesses)
          .set(businessData)
          .where(eq(businesses.id, existingBusinesses[0].id))
          .returning();
        updatedOrCreatedBusiness = updatedBus;
      } else {
        // Insert new profile
        const [newBus] = await db
          .insert(businesses)
          .values(businessData)
          .returning();
        updatedOrCreatedBusiness = newBus;
      }
    }

    return res.status(200).json({
      message: "Profile and billing settings updated successfully",
      user: updatedUser,
      business: updatedOrCreatedBusiness,
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: error.message || "Failed to update profile settings" });
  }
}

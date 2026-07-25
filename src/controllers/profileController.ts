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
      profileCompletion: computeCompletion(user, myBusinesses[0]),
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Failed to retrieve profile details" });
  }
}

/**
 * Authoritative profile-completion percentage. A business account is scored on
 * its company + contact fields; an individual on their personal contact fields.
 * This is the single source of truth — the client renders it rather than
 * recomputing, so the number can't be inferred from or diverge in the UI.
 */
function computeCompletion(
  user: { firstName?: string | null; email?: string | null; phone?: string | null },
  business?: {
    businessName?: string | null;
    pan?: string | null;
    gstin?: string | null;
    cin?: string | null;
    incorporationDate?: string | Date | null;
    address?: string | null;
    postalAddress?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  },
): number {
  const isBusiness = !!(business?.cin || business?.businessName);

  const fields = isBusiness
    ? [
        business?.businessName,
        business?.pan,
        business?.gstin,
        business?.cin,
        business?.incorporationDate,
        business?.address || business?.postalAddress,
        business?.city,
        business?.state,
        business?.pincode,
        user?.email,
        user?.phone,
      ]
    : [user?.firstName, user?.email, user?.phone];

  const filled = fields.filter((f) => !!(f && String(f).trim())).length;
  return fields.length ? Math.round((filled / fields.length) * 100) : 0;
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
      cin,
      state,
      city,
      pincode,
      address,
      postalAddress,
      incorporationDate,
      directors,
      aadhaar,
      passport,
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
      businessName !== undefined ||
      legalName !== undefined ||
      gstin !== undefined ||
      pan !== undefined ||
      cin !== undefined ||
      state !== undefined ||
      city !== undefined ||
      pincode !== undefined ||
      address !== undefined ||
      postalAddress !== undefined ||
      incorporationDate !== undefined ||
      directors !== undefined ||
      aadhaar !== undefined ||
      passport !== undefined;

    if (hasBillingUpdates) {
      const existingBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.customerId, userId))
        .limit(1);

      const businessData = {
        customerId: userId,
        businessName: (businessName !== undefined ? businessName : (existingBusinesses[0]?.businessName || updatedUser.firstName + " Billing Profile")).trim(),
        legalName: (legalName !== undefined ? legalName : (existingBusinesses[0]?.legalName || businessName || "")).trim(),
        gstin: gstin !== undefined ? (gstin || "").trim() : (existingBusinesses[0]?.gstin || ""),
        pan: pan !== undefined ? (pan || "").trim() : (existingBusinesses[0]?.pan || ""),
        cin: cin !== undefined ? (cin || "").trim() : (existingBusinesses[0]?.cin || ""),
        state: state !== undefined ? (state || "").trim() : (existingBusinesses[0]?.state || ""),
        city: city !== undefined ? (city || "").trim() : (existingBusinesses[0]?.city || ""),
        pincode: pincode !== undefined ? (pincode || "").trim() : (existingBusinesses[0]?.pincode || ""),
        address: address !== undefined ? (address || "").trim() : (existingBusinesses[0]?.address || ""),
        postalAddress: postalAddress !== undefined ? (postalAddress || "").trim() : (existingBusinesses[0]?.postalAddress || ""),
        incorporationDate: incorporationDate !== undefined ? (incorporationDate || null) : (existingBusinesses[0]?.incorporationDate || null),
        directors: directors !== undefined ? directors : (existingBusinesses[0]?.directors || null),
        aadhaar: aadhaar !== undefined ? (aadhaar || "").trim() : (existingBusinesses[0]?.aadhaar || ""),
        passport: passport !== undefined ? (passport || "").trim() : (existingBusinesses[0]?.passport || ""),
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
    return res.status(500).json({ error: "Failed to update profile settings" });
  }
}

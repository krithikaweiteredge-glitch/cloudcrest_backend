import { Response } from "express";
import { db } from "../config/db.js";
import { users, roles } from "../models/schema.js";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "../utils/auth.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { logActivity } from "../utils/auditLogger.js";

// The single non-admin staff role. Employees added from the admin console are
// created as Coordinators — they share the admin console but without catalog or
// employee-management access.
const COORDINATOR_ROLE = "Coordinator";

/** Look up the Coordinator role id, creating the role row on first use. */
async function ensureCoordinatorRoleId(): Promise<number> {
  const existing = await db
    .select()
    .from(roles)
    .where(eq(roles.name, COORDINATOR_ROLE))
    .limit(1);
  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(roles)
    .values({ name: COORDINATOR_ROLE, description: "Operations coordinator (staff)" })
    .returning();
  return created.id;
}

// 1. LIST ALL COORDINATORS (staff employees)
export async function listEmployees(_req: AuthenticatedRequest, res: Response) {
  try {
    const list = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        roleName: roles.name,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(roles.name, COORDINATOR_ROLE));

    return res.status(200).json(list);
  } catch (error: any) {
    console.error("Admin list employees error:", error);
    return res.status(500).json({ error: "Failed to fetch employees list" });
  }
}

// 2. CREATE A COORDINATOR
export async function createEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({ error: "First name, email and password are required." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Reject duplicate emails up-front (users.email is unique in the schema too).
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    const roleId = await ensureCoordinatorRoleId();
    const passwordHash = await hashPassword(password);

    const [created] = await db
      .insert(users)
      .values({
        firstName: String(firstName).trim(),
        lastName: lastName ? String(lastName).trim() : null,
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        passwordHash,
        roleId,
        status: "active",
      })
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
      });

    if (req.user?.id) {
      await logActivity(
        req.user.id,
        `Created coordinator account for ${normalizedEmail}`,
        "users",
        created.id
      );
    }

    return res.status(201).json({
      message: "Coordinator created successfully",
      employee: { ...created, roleName: COORDINATOR_ROLE },
    });
  } catch (error: any) {
    console.error("Admin create employee error:", error);
    return res.status(500).json({ error: "Failed to create coordinator" });
  }
}

// 3. BLOCK / UNBLOCK A COORDINATOR
export async function updateEmployeeStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const employeeId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (isNaN(employeeId)) {
      return res.status(400).json({ error: "Invalid employee ID" });
    }

    const allowed = ["active", "blocked"];
    if (!status || !allowed.includes(String(status).toLowerCase())) {
      return res.status(400).json({ error: "Invalid status. Allowed values: active, blocked." });
    }
    const targetStatus = String(status).toLowerCase();

    // Only ever touch Coordinator accounts through this endpoint — never an admin
    // or a customer. Resolve the role id and scope the update to it.
    const roleId = await ensureCoordinatorRoleId();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, employeeId), eq(users.roleId, roleId)))
      .limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Coordinator not found" });
    }

    await db
      .update(users)
      .set({ status: targetStatus })
      .where(and(eq(users.id, employeeId), eq(users.roleId, roleId)));

    if (req.user?.id) {
      await logActivity(
        req.user.id,
        `${targetStatus === "blocked" ? "Blocked" : "Unblocked"} coordinator ID ${employeeId}`,
        "users",
        employeeId
      );
    }

    return res.status(200).json({ message: `Coordinator ${targetStatus}`, status: targetStatus });
  } catch (error: any) {
    console.error("Admin update employee status error:", error);
    return res.status(500).json({ error: "Failed to update coordinator status" });
  }
}

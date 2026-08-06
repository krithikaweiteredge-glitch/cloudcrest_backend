import { db } from "./src/config/db.js";
import { users, roles } from "./src/models/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "./src/utils/auth.js";

async function seed() {
  // Ensure roles exist
  const existingRoles = await db.select().from(roles);
  const roleNames = existingRoles.map((r) => r.name);
  if (!roleNames.includes("Admin")) {
    await db.insert(roles).values({ name: "Admin" }).returning();
    console.log("✅ Admin role created");
  }
  if (!roleNames.includes("Customer")) {
    await db.insert(roles).values({ name: "Customer" }).returning();
    console.log("✅ Customer role created");
  }
  if (!roleNames.includes("Coordinator")) {
    await db.insert(roles).values({ name: "Coordinator", description: "Operations coordinator (staff)" }).returning();
    console.log("✅ Coordinator role created");
  }

  // Get admin role id
  const adminRole = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
  if (adminRole.length === 0) {
    throw new Error("Admin role not found after creation");
  }

  // Credentials come from the environment so the password never lives in the repo.
  // Defaults preserve the historical local-dev behaviour.
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@cloudcrest.com").trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await hashPassword(adminPassword);

  const existing = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({
      firstName: "Admin",
      lastName: "User",
      email: adminEmail,
      phone: "",
      passwordHash,
      roleId: adminRole[0].id,
      status: "active",
    }).returning();
    console.log(`✅ Admin user created (email: ${adminEmail})`);
  } else {
    // Re-running rotates the password and re-asserts an active Admin account,
    // instead of silently no-op'ing when the user already exists.
    await db
      .update(users)
      .set({ passwordHash, roleId: adminRole[0].id, status: "active" })
      .where(eq(users.email, adminEmail));
    console.log(`✅ Admin user updated (email: ${adminEmail}) — password reset`);
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error("⚠️ Seeding failed:", err);
  process.exit(1);
});

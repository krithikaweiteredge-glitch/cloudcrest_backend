import { db } from "./src/config/db.js";
import { users, roles } from "./src/models/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "./src/utils/auth.js";

async function seed() {
  // Ensure roles exist
  const existingRoles = await db.select().from(roles);
  const roleNames = existingRoles.map(r => r.name);
  if (!roleNames.includes("Admin")) {
    await db.insert(roles).values({ name: "Admin" }).returning();
    console.log("✅ Admin role created");
  }
  if (!roleNames.includes("Customer")) {
    await db.insert(roles).values({ name: "Customer" }).returning();
    console.log("✅ Customer role created");
  }

  // Get admin role id
  const adminRole = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
  if (adminRole.length === 0) {
    throw new Error("Admin role not found after creation");
  }

  const adminEmail = "admin@cloudcrest.com";
  const adminExists = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (adminExists.length === 0) {
    const passwordHash = await hashPassword("admin123"); // default password – change as needed
    await db.insert(users).values({
      firstName: "Admin",
      lastName: "User",
      email: adminEmail,
      phone: "",
      passwordHash,
      roleId: adminRole[0].id,
      status: "active",
    }).returning();
    console.log("✅ Admin user created (email: admin@cloudcrest.com, password: admin123)");
  } else {
    console.log("✅ Admin user already exists");
  }
}

seed().catch(err => {
  console.error("⚠️ Seeding failed:", err);
  process.exit(1);
});

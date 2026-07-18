import { db, pool } from "../config/db.js";
import { roles, serviceCategories, serviceSubcategories, services, users, documentTypes } from "../models/schema.js";
import { count, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting database setup and seeding...");

  try {
    // 1. Check if database connection works
    console.log("Checking database connection...");
    const client = await pool.connect();
    console.log("Database connection successful!");
    client.release();

    // 2. Check and seed roles
    console.log("Checking existing roles...");
    const roleCountResult = await db.select({ val: count() }).from(roles);
    const roleCount = roleCountResult[0]?.val ?? 0;

    let adminRoleId = 3;
    let customerRoleId = 1;

    if (roleCount === 0) {
      console.log("No roles found. Seeding default roles...");
      const insertedRoles = await db
        .insert(roles)
        .values([
          {
            name: "Customer",
            description: "A customer who registers businesses and submits service requests",
          },
          {
            name: "CA/Professional",
            description: "A Chartered Accountant or professional executing and managing workflows",
          },
          {
            name: "Admin",
            description: "System administrator with full privileges",
          },
        ])
        .returning();
      console.log(`Successfully seeded ${insertedRoles.length} default roles.`);
      customerRoleId = insertedRoles[0].id;
      adminRoleId = insertedRoles[2].id;
    } else {
      console.log(`Roles table already populated with ${roleCount} entries.`);
      const existingRoles = await db.select().from(roles);
      customerRoleId = existingRoles.find(r => r.name === "Customer")?.id ?? 1;
      adminRoleId = existingRoles.find(r => r.name === "Admin")?.id ?? 3;
    }

    // 3. Seed Default Admin User
    console.log("Checking existing admin user...");
    const adminCheck = await db.select().from(users).where(eq(users.email, "admin@cloudcrest.com")).limit(1);
    if (adminCheck.length === 0) {
      console.log("Admin user not found. Seeding default admin account (admin@cloudcrest.com / admin123)...");
      const passwordHash = await bcrypt.hash("admin123", 10);
      await db.insert(users).values({
        firstName: "System",
        lastName: "Admin",
        email: "admin@cloudcrest.com",
        phone: "9999999999",
        passwordHash,
        roleId: adminRoleId,
        status: "active",
      });
      console.log("Admin account seeded successfully!");
    } else {
      console.log("Admin account already exists.");
    }

    // 4. Check and seed service categories
    console.log("Checking existing service categories...");
    const categoryCountResult = await db.select({ val: count() }).from(serviceCategories);
    const categoryCount = categoryCountResult[0]?.val ?? 0;

    let catId = 1;
    if (categoryCount === 0) {
      console.log("No service categories found. Seeding default category...");
      const insertedCats = await db
        .insert(serviceCategories)
        .values({
          name: "Entity Registration",
        })
        .returning();
      catId = insertedCats[0].id;
      console.log(`Seeded category: ${insertedCats[0].name} (ID: ${catId})`);
    } else {
      const existingCats = await db.select().from(serviceCategories).limit(1);
      catId = existingCats[0].id;
      console.log(`Service categories exist. Using category ID: ${catId}`);
    }

    // 5. Check and seed subcategories
    console.log("Checking existing service subcategories...");
    const subcatCountResult = await db.select({ val: count() }).from(serviceSubcategories);
    const subcatCount = subcatCountResult[0]?.val ?? 0;

    let companySubcatId = 1;
    let llpSubcatId = 2;
    if (subcatCount === 0) {
      console.log("No subcategories found. Seeding defaults...");
      const insertedSubcats = await db
        .insert(serviceSubcategories)
        .values([
          { categoryId: catId, name: "Company Registration" },
          { categoryId: catId, name: "LLP Registration" },
        ])
        .returning();
      companySubcatId = insertedSubcats[0].id;
      llpSubcatId = insertedSubcats[1].id;
      console.log(`Seeded company subcategory ID: ${companySubcatId}, LLP subcategory ID: ${llpSubcatId}`);
    } else {
      const existingSubcats = await db.select().from(serviceSubcategories).limit(2);
      companySubcatId = existingSubcats[0]?.id ?? 1;
      llpSubcatId = existingSubcats[1]?.id ?? 2;
      console.log(`Subcategories exist. Using company subcategory: ${companySubcatId}, LLP subcategory: ${llpSubcatId}`);
    }

    // 6. Check and seed services
    console.log("Checking existing services...");
    const serviceCountResult = await db.select({ val: count() }).from(services);
    const serviceCount = serviceCountResult[0]?.val ?? 0;

    if (serviceCount === 0) {
      console.log("No services found. Seeding default services...");
      const insertedServices = await db
        .insert(services)
        .values([
          {
            subcategoryId: companySubcatId,
            name: "Private Limited Company Registration",
            description: "Incorporation of a Private Limited Company under MCA SPICe+",
            professionalFee: "10000.00",
            govtFee: "2000.00",
            gstPercent: "18.00",
            active: true,
          },
          {
            subcategoryId: llpSubcatId,
            name: "LLP Registration",
            description: "Incorporation of a Limited Liability Partnership under FiLLiP",
            professionalFee: "10000.00",
            govtFee: "500.00",
            gstPercent: "18.00",
            active: true,
          },
        ])
        .returning();
      console.log(`Successfully seeded ${insertedServices.length} default services.`);
    } else {
      console.log("Services table already populated.");
    }

    // 7. Seed Document Checklists
    console.log("Checking existing document types...");
    const docTypeCountResult = await db.select({ val: count() }).from(documentTypes);
    const docTypeCount = docTypeCountResult[0]?.val ?? 0;
    if (docTypeCount === 0) {
      console.log("No document types found. Seeding checklists...");
      await db.insert(documentTypes).values([
        // Service 1: Company Registration (Private Limited)
        { serviceId: 1, name: "PAN Card of Directors", mandatory: true },
        { serviceId: 1, name: "Aadhaar Card of Directors", mandatory: true },
        { serviceId: 1, name: "Utility Bill (Office Address Proof)", mandatory: true },
        { serviceId: 1, name: "NOC from Property Owner", mandatory: true },
        // Service 2: LLP Registration
        { serviceId: 2, name: "PAN Card of Partners", mandatory: true },
        { serviceId: 2, name: "Aadhaar Card of Partners", mandatory: true },
        { serviceId: 2, name: "Utility Bill (Registered Office)", mandatory: true },
        { serviceId: 2, name: "Draft Partnership Agreement", mandatory: false },
      ]);
      console.log("Successfully seeded document checklists!");
    } else {
      console.log("Document types already populated.");
    }

    console.log("Database setup and seeding completed successfully.");
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  } finally {
    // Close the database pool
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});

import { db, pool } from "../config/db.js";
import {
  roles,
  serviceCategories,
  serviceSubcategories,
  services,
  users,
  documentTypes,
  notifications,
  orderDocuments,
  orderFieldValues,
  payments,
  invoices,
  estimates,
  orders,
  businesses,
  supportTickets,
  ticketMessages,
  serviceForms,
  serviceFields,
} from "../models/schema.js";
import { count, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Full catalog definitions matching frontend slugs and checklists
const CATALOG = [
  {
    category: "Entity Registration",
    subcategories: [
      {
        name: "Company Registration",
        services: [
          {
            name: "Private Limited Company Registration",
            description: "Incorporation of a Private Limited Company under MCA",
            professionalFee: "7500.00",
            govtFee: "2200.00",
            gstPercent: "18.00",
            documents: [
              "PAN Card of Directors",
              "Aadhaar Card of Directors",
              "Utility Bill (Office Address Proof)",
              "NOC from Property Owner"
            ],
            form: {
              name: "MCA Part B",
              fields: [
                { label: "Proposed Company Name 1", key: "name1", type: "text", required: true, sortOrder: 1 },
                { label: "Proposed Company Name 2", key: "name2", type: "text", required: false, sortOrder: 2 },
                { label: "Authorized Share Capital (INR)", key: "capital", type: "number", required: true, sortOrder: 3 },
                { label: "Main Business Activity Summary", key: "objects", type: "text", required: true, sortOrder: 4 },
                { label: "State of Incorporation", key: "state", type: "text", required: true, sortOrder: 5 }
              ]
            }
          }
        ]
      },
      {
        name: "LLP Registration",
        services: [
          {
            name: "LLP Registration",
            description: "Incorporation of a Limited Liability Partnership under FiLLiP",
            professionalFee: "7500.00",
            govtFee: "500.00",
            gstPercent: "18.00",
            documents: [
              "PAN & Aadhaar of designated partners",
              "Passport-size photos",
              "Digital Signature (DSC)",
              "Address proof of office",
              "Rent agreement + NOC",
              "LLP agreement draft",
              "Consent letters (Form 9)"
            ],
            form: {
              name: "FiLLiP Form",
              fields: [
                { label: "Proposed LLP Name 1", key: "llpName1", type: "text", required: true, sortOrder: 1 },
                { label: "Proposed LLP Name 2", key: "llpName2", type: "text", required: false, sortOrder: 2 },
                { label: "Total Capital Contribution (INR)", key: "contribution", type: "number", required: true, sortOrder: 3 }
              ]
            }
          }
        ]
      },
      {
        name: "Other Entity Registration",
        services: [
          {
            name: "Partnership Firm Registration",
            description: "Registration of Partnership Firm with Registrar of Firms",
            professionalFee: "4500.00",
            govtFee: "1000.00",
            gstPercent: "18.00",
            documents: [
              "PAN of all partners",
              "Aadhaar of partners",
              "Partnership deed",
              "Address proof of firm",
              "Rent agreement / ownership proof"
            ]
          },
          {
            name: "Trust & Societies",
            description: "Trust Deed Registration and Society Incorporation",
            professionalFee: "9500.00",
            govtFee: "2000.00",
            gstPercent: "18.00",
            documents: [
              "Trust deed / MoA",
              "PAN & Aadhaar of trustees / members",
              "Address proof of office",
              "Photographs of trustees",
              "Registered office NOC"
            ]
          },
          {
            name: "HUF Registration",
            description: "Creation of Hindu Undivided Family entity",
            professionalFee: "3500.00",
            govtFee: "0.00",
            gstPercent: "18.00",
            documents: [
              "PAN of Karta",
              "Aadhaar of Karta and coparceners",
              "HUF deed on stamp paper",
              "Bank account proof"
            ]
          }
        ]
      }
    ]
  },
  {
    category: "Tax Registration",
    subcategories: [
      {
        name: "Direct & Indirect Tax",
        services: [
          {
            name: "GST Registration",
            description: "Goods and Services Tax Registration with GSTN",
            professionalFee: "1500.00",
            govtFee: "0.00",
            gstPercent: "18.00",
            documents: [
              "PAN of business",
              "Aadhaar of proprietor / partners",
              "Business address proof",
              "Rent agreement + NOC",
              "Bank statement or cancelled cheque",
              "Board resolution (companies)",
              "Digital Signature (DSC)"
            ]
          },
          {
            name: "PAN & TAN Registration",
            description: "Permanent Account Number and Tax Deduction Account Number allotment",
            professionalFee: "1000.00",
            govtFee: "100.00",
            gstPercent: "18.00",
            documents: [
              "Identity proof (Aadhaar / Passport)",
              "Address proof",
              "Date of birth proof",
              "Passport-size photograph",
              "Business registration proof (for TAN)"
            ]
          },
          {
            name: "MSME / Udyam Registration",
            description: "Micro, Small and Medium Enterprises certification",
            professionalFee: "1200.00",
            govtFee: "0.00",
            gstPercent: "18.00",
            documents: [
              "Aadhaar of proprietor / signatory",
              "PAN of business",
              "Bank account details",
              "Business address proof",
              "Investment & turnover details"
            ]
          },
          {
            name: "IEC Import-Export Registration",
            description: "Importer Exporter Code license from DGFT",
            professionalFee: "2500.00",
            govtFee: "500.00",
            gstPercent: "18.00",
            documents: [
              "PAN of applicant / entity",
              "Aadhaar / voter ID of proprietor",
              "Business address proof",
              "Cancelled cheque of current account",
              "Digital photograph"
            ]
          },
          {
            name: "Startup India / DPIIT Recognition",
            description: "Tax exemption and DPIIT recognition for startups",
            professionalFee: "12500.00",
            govtFee: "0.00",
            gstPercent: "18.00",
            documents: [
              "Certificate of incorporation",
              "PAN of entity",
              "Brief write-up on innovation",
              "Website / pitch deck",
              "Details of directors / founders"
            ]
          }
        ]
      }
    ]
  },
  {
    category: "Labour Law",
    subcategories: [
      {
        name: "Labour Law Compliances",
        services: [
          {
            name: "Labour Licence",
            description: "Contract Labour (Regulation & Abolition) Act license",
            professionalFee: "6500.00",
            govtFee: "1500.00",
            gstPercent: "18.00",
            documents: [
              "Certificate of incorporation",
              "PAN of establishment",
              "Address proof",
              "List of workers / contract labour",
              "Consent of principal employer"
            ]
          },
          {
            name: "EPF Registration",
            description: "Employees Provident Fund establishment registration",
            professionalFee: "3500.00",
            govtFee: "0.00",
            gstPercent: "18.00",
            documents: [
              "PAN of establishment",
              "Certificate of incorporation",
              "Address proof of premises",
              "List of employees with salary",
              "Bank account details",
              "Digital Signature (DSC)"
            ]
          },
          {
            name: "ESI Registration",
            description: "Employees State Insurance registration",
            professionalFee: "3500.00",
            govtFee: "0.00",
            gstPercent: "18.00",
            documents: [
              "PAN of establishment",
              "Registration certificate under Shops & Estd.",
              "Address proof",
              "List of employees & wages",
              "Bank details",
              "Cancelled cheque"
            ]
          }
        ]
      }
    ]
  },
  {
    category: "Municipal Licences",
    subcategories: [
      {
        name: "Municipal Licences",
        services: [
          {
            name: "Shop & Establishment Registration",
            description: "Gumasta / Shop Act licence from local municipality",
            professionalFee: "1500.00",
            govtFee: "500.00",
            gstPercent: "18.00",
            documents: [
              "PAN & Aadhaar of proprietor",
              "Address proof of shop",
              "Rent agreement / ownership proof",
              "Photograph of shop front",
              "List of employees"
            ]
          },
          {
            name: "Trade Licence",
            description: "Permit to carry out trade activities in municipal limits",
            professionalFee: "5500.00",
            govtFee: "2500.00",
            gstPercent: "18.00",
            documents: [
              "PAN & Aadhaar of applicant",
              "Property tax receipt / ownership proof",
              "NOC from landlord",
              "Layout plan of premises",
              "Photographs of the premises"
            ]
          },
          {
            name: "Fire NOC",
            description: "Fire Safety Certificate from Fire Department",
            professionalFee: "12500.00",
            govtFee: "5000.00",
            gstPercent: "18.00",
            documents: [
              "Building plan approved by authority",
              "Ownership / lease deed",
              "Occupancy certificate",
              "Details of fire safety measures",
              "Photographs of installations"
            ]
          }
        ]
      }
    ]
  },
  {
    category: "Industry Licences",
    subcategories: [
      {
        name: "Industry Licences",
        services: [
          {
            name: "FSSAI Licence",
            description: "Food Safety and Standards Authority of India registration",
            professionalFee: "4500.00",
            govtFee: "2000.00",
            gstPercent: "18.00",
            documents: [
              "PAN & Aadhaar of applicant",
              "Business address proof",
              "List of food products",
              "Layout of processing unit",
              "Water test report",
              "Food safety management plan"
            ]
          },
          {
            name: "Pollution Control NOC",
            description: "Consent to Establish & Operate from State Pollution Board",
            professionalFee: "15000.00",
            govtFee: "10000.00",
            gstPercent: "18.00",
            documents: [
              "Incorporation certificate",
              "Site plan & manufacturing process",
              "Consent application form",
              "Land documents",
              "List of hazardous materials"
            ]
          },
          {
            name: "Drug Licence",
            description: "Wholesale or Retail Drug License from State FDA",
            professionalFee: "18500.00",
            govtFee: "3000.00",
            gstPercent: "18.00",
            documents: [
              "Site plan & key plan of premises",
              "Qualification certificates of pharmacist",
              "Affidavit of non-conviction",
              "Ownership / rent proof",
              "Cold storage details (if applicable)"
            ]
          }
        ]
      }
    ]
  },
  {
    category: "Intellectual Property",
    subcategories: [
      {
        name: "Intellectual Property",
        services: [
          {
            name: "Trademark Registration",
            description: "Brand name, logo, or wordmark trademark filing",
            professionalFee: "4500.00",
            govtFee: "4500.00",
            gstPercent: "18.00",
            documents: [
              "Logo / wordmark in JPG/PNG",
              "Trademark class & description",
              "Applicant identity proof",
              "Business registration proof",
              "User affidavit (if prior use)",
              "Power of Attorney (TM-48)"
            ]
          },
          {
            name: "Patent Registration",
            description: "Filing and drafting of patent specifications",
            professionalFee: "35000.00",
            govtFee: "8000.00",
            gstPercent: "18.00",
            documents: [
              "Detailed invention description",
              "Drawings / diagrams",
              "Applicant details",
              "Priority document (if any)",
              "Form-1, 2, 3, 5 drafts",
              "Assignment deed (if applicable)"
            ]
          },
          {
            name: "Copyright Registration",
            description: "Registration of artistic, literary, or software copyrights",
            professionalFee: "5500.00",
            govtFee: "500.00",
            gstPercent: "18.00",
            documents: [
              "Copy of the work being registered",
              "Applicant identity proof",
              "NOC from author (if different)",
              "Power of Attorney",
              "Publisher details (if published)"
            ]
          },
          {
            name: "Design Registration",
            description: "Industrial design shape or aesthetic pattern protection",
            professionalFee: "7500.00",
            govtFee: "1000.00",
            gstPercent: "18.00",
            documents: [
              "Representation of the design (4 views)",
              "Novelty statement",
              "Applicant identity proof",
              "Power of Attorney",
              "Class of article (Locarno)"
            ]
          }
        ]
      }
    ]
  }
];

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
      customerRoleId = existingRoles.find((r) => r.name === "Customer")?.id ?? 1;
      adminRoleId = existingRoles.find((r) => r.name === "Admin")?.id ?? 3;
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

    // Roles + admin are all this script seeds now — it is safe to run anytime.
    // The service catalog is owned by `db:seed:catalog`; the legacy catalog below
    // (no slugs) is intentionally NOT seeded, and the destructive table wipe is
    // gated behind SEED_WIPE=true so a stray run can never delete production data.
    if (process.env.SEED_WIPE !== "true") {
      console.log("Roles & admin ensured. Skipping catalog wipe/seed (run db:seed:catalog for the catalog).");
      return;
    }

    // 4. Truncate all transaction and catalog tables to prevent foreign key errors
    console.log("Cleaning existing database tables...");
    await db.delete(notifications);
    await db.delete(ticketMessages);
    await db.delete(supportTickets);
    await db.delete(orderDocuments);
    await db.delete(orderFieldValues);
    await db.delete(payments);
    await db.delete(invoices);
    await db.delete(estimates);
    await db.delete(orders);
    await db.delete(businesses);

    await db.delete(serviceFields);
    await db.delete(serviceForms);
    await db.delete(documentTypes);
    await db.delete(services);
    await db.delete(serviceSubcategories);
    await db.delete(serviceCategories);

    // 5. Seed full catalog loop
    console.log("Seeding full service catalog...");
    for (const group of CATALOG) {
      const [cat] = await db
        .insert(serviceCategories)
        .values({ name: group.category })
        .returning();

      for (const sub of group.subcategories) {
        const [subcat] = await db
          .insert(serviceSubcategories)
          .values({ categoryId: cat.id, name: sub.name })
          .returning();

        for (const srv of sub.services) {
          const [insertedService] = await db
            .insert(services)
            .values({
              subcategoryId: subcat.id,
              name: srv.name,
              description: srv.description,
              professionalFee: srv.professionalFee,
              govtFee: srv.govtFee,
              gstPercent: srv.gstPercent,
              active: true,
            })
            .returning();

          // Seed Document checklist
          for (const doc of srv.documents) {
            await db.insert(documentTypes).values({
              serviceId: insertedService.id,
              name: doc,
              mandatory: true,
            });
          }

          // Seed Wizard Form Schema (if defined)
          const formDefinition = (srv as any).form;
          if (formDefinition) {
            const [form] = await db
              .insert(serviceForms)
              .values({
                serviceId: insertedService.id,
                name: formDefinition.name,
                version: 1,
              })
              .returning();

            for (const fld of formDefinition.fields) {
              await db.insert(serviceFields).values({
                formId: form.id,
                label: fld.label,
                fieldKey: fld.key,
                fieldType: fld.type,
                required: fld.required,
                sortOrder: fld.sortOrder,
              });
            }
          }
        }
      }
    }

    console.log("Database setup and seeding completed successfully.");
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Unhanded rejection in seeder:", e);
  process.exit(1);
});

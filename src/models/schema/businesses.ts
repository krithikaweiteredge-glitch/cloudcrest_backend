import { pgTable, bigserial, varchar, text, date, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { users } from "./auth.js";

// 3. BUSINESSES TABLE
export const businesses = pgTable("businesses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).references(() => users.id).notNull(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 100 }),
  pan: varchar("pan", { length: 20 }),
  gstin: varchar("gstin", { length: 20 }),
  tan: varchar("tan", { length: 20 }),
  cin: varchar("cin", { length: 50 }),
  llpin: varchar("llpin", { length: 50 }),
  udyamNo: varchar("udyam_no", { length: 50 }),
  incorporationDate: date("incorporation_date"),
  state: varchar("state", { length: 100 }),
  city: varchar("city", { length: 100 }),
  pincode: varchar("pincode", { length: 20 }),
  address: text("address"),
  postalAddress: text("postal_address"),
  directors: text("directors"),
  aadhaar: varchar("aadhaar", { length: 20 }),
  passport: varchar("passport", { length: 50 }),
  status: varchar("status", { length: 50 }).default("active"),
});

export type Business = InferSelectModel<typeof businesses>;
export type NewBusiness = InferInsertModel<typeof businesses>;

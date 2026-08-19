import { pgTable, bigserial, varchar, text, decimal, boolean, integer, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// 4. SERVICE CATEGORIES TABLE
export const serviceCategories = pgTable("service_categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type ServiceCategory = InferSelectModel<typeof serviceCategories>;
export type NewServiceCategory = InferInsertModel<typeof serviceCategories>;

// 5. SERVICE SUBCATEGORIES TABLE
export const serviceSubcategories = pgTable("service_subcategories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  categoryId: bigint("category_id", { mode: "number" }).references(() => serviceCategories.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type ServiceSubcategory = InferSelectModel<typeof serviceSubcategories>;
export type NewServiceSubcategory = InferInsertModel<typeof serviceSubcategories>;

// 6. SERVICES TABLE
export const services = pgTable("services", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  subcategoryId: bigint("subcategory_id", { mode: "number" }).references(() => serviceSubcategories.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  professionalFee: decimal("professional_fee", { precision: 12, scale: 2 }).notNull(),
  govtFee: decimal("govt_fee", { precision: 12, scale: 2 }).notNull(),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).notNull(),
  active: boolean("active").default(true).notNull(),
  // Customer-facing presentation. A service only appears in the customer sidebar
  // once it has a slug (this keeps legacy seeded rows hidden).
  slug: varchar("slug", { length: 255 }),
  shortTitle: varchar("short_title", { length: 255 }),
  authority: varchar("authority", { length: 255 }),
  formNo: varchar("form_no", { length: 255 }),
  icon: varchar("icon", { length: 60 }),
  whoCanApply: text("who_can_apply"),
  actsRules: text("acts_rules"),
  validity: varchar("validity", { length: 255 }),
  // Home-page card chips: turnaround (e.g. "7–10 Days") and the document count.
  // Admin-editable so they're no longer hardcoded in the frontend.
  timelineDays: varchar("timeline_days", { length: 60 }),
  documentsCount: integer("documents_count"),
  nswsApplied: boolean("nsws_applied").default(false),
  actsRulesPdfs: text("acts_rules_pdfs"),
  tabs: text("tabs"),
  // JSON array of `{ label, amount }` the admin authored for this service. When
  // empty the professional/govt/GST columns above drive the fee breakdown.
  feeLines: text("fee_lines"),
  // JSON `{ suffix, minDirectors, minShareholders, requiresNominee, tags, popular }`
  // for wizard-driven entity types (company-*/llp-*). Lets an admin set each type's
  // legal name suffix and incorporation rules from the catalog instead of code.
  // Null for every non-wizard service.
  wizardRules: text("wizard_rules"),
});

export type Service = InferSelectModel<typeof services>;
export type NewService = InferInsertModel<typeof services>;

// 7. SERVICE FORMS TABLE
export const serviceForms = pgTable("service_forms", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  serviceId: bigint("service_id", { mode: "number" }).references(() => services.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  version: integer("version").default(1).notNull(),
});

export type ServiceForm = InferSelectModel<typeof serviceForms>;
export type NewServiceForm = InferInsertModel<typeof serviceForms>;

// 8. SERVICE FIELDS TABLE
export const serviceFields = pgTable("service_fields", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  formId: bigint("form_id", { mode: "number" }).references(() => serviceForms.id).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  fieldKey: varchar("field_key", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 100 }).notNull(),
  required: boolean("required").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  stepName: varchar("step_name", { length: 255 }),
  options: text("options"),
});

export type ServiceField = InferSelectModel<typeof serviceFields>;
export type NewServiceField = InferInsertModel<typeof serviceFields>;

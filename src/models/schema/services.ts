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
});

export type ServiceField = InferSelectModel<typeof serviceFields>;
export type NewServiceField = InferInsertModel<typeof serviceFields>;

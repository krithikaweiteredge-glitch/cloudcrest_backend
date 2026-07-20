import { pgTable, bigserial, varchar, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { users } from "./auth.js";

// SERVICE REQUESTS TABLE
export const serviceRequests = pgTable("service_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  serviceSlug: varchar("service_slug", { length: 255 }).notNull(),
  serviceTitle: varchar("service_title", { length: 255 }).notNull(),
  authority: varchar("authority", { length: 255 }),
  form: varchar("form", { length: 255 }),
  businessName: varchar("business_name", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 100 }).default("submitted").notNull(),
  referenceNo: varchar("reference_no", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ServiceRequest = InferSelectModel<typeof serviceRequests>;
export type NewServiceRequest = InferInsertModel<typeof serviceRequests>;

// REQUEST DOCUMENTS TABLE
export const requestDocuments = pgTable("request_documents", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestId: bigint("request_id", { mode: "number" }).references(() => serviceRequests.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  storagePath: varchar("storage_path", { length: 1024 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RequestDocument = InferSelectModel<typeof requestDocuments>;
export type NewRequestDocument = InferInsertModel<typeof requestDocuments>;

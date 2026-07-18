import { pgTable, bigserial, varchar, timestamp, boolean, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { services } from "./services.js";
import { orders } from "./orders.js";

// 9. DOCUMENT TYPES TABLE
export const documentTypes = pgTable("document_types", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  serviceId: bigint("service_id", { mode: "number" }).references(() => services.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  mandatory: boolean("mandatory").default(false).notNull(),
});

export type DocumentType = InferSelectModel<typeof documentTypes>;
export type NewDocumentType = InferInsertModel<typeof documentTypes>;

// 12. ORDER DOCUMENTS TABLE
export const orderDocuments = pgTable("order_documents", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id).notNull(),
  documentTypeId: bigint("document_type_id", { mode: "number" }).references(() => documentTypes.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1024 }).notNull(),
  verificationStatus: varchar("verification_status", { length: 50 }).default("pending").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type OrderDocument = InferSelectModel<typeof orderDocuments>;
export type NewOrderDocument = InferInsertModel<typeof orderDocuments>;

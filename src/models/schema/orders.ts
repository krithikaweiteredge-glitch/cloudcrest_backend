import { pgTable, bigserial, varchar, text, decimal, timestamp, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { users } from "./auth.js";
import { businesses } from "./businesses.js";
import { services, serviceFields } from "./services.js";

// 10. ORDERS TABLE
export const orders = pgTable("orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderNo: varchar("order_no", { length: 100 }).notNull().unique(),
  customerId: bigint("customer_id", { mode: "number" }).references(() => users.id).notNull(),
  businessId: bigint("business_id", { mode: "number" }).references(() => businesses.id),
  serviceId: bigint("service_id", { mode: "number" }).references(() => services.id).notNull(),
  status: varchar("status", { length: 100 }).default("pending").notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }).notNull(),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 50 }).default("unpaid").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

// 11. ORDER FIELD VALUES TABLE
export const orderFieldValues = pgTable("order_field_values", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id).notNull(),
  fieldId: bigint("field_id", { mode: "number" }).references(() => serviceFields.id).notNull(),
  value: text("value"),
});

export type OrderFieldValue = InferSelectModel<typeof orderFieldValues>;
export type NewOrderFieldValue = InferInsertModel<typeof orderFieldValues>;

// 16. ESTIMATES TABLE
export const estimates = pgTable("estimates", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id).notNull(),
  professionalFee: decimal("professional_fee", { precision: 12, scale: 2 }).notNull(),
  govtFee: decimal("govt_fee", { precision: 12, scale: 2 }).notNull(),
  otherFee: decimal("other_fee", { precision: 12, scale: 2 }).default("0.00").notNull(),
  gst: decimal("gst", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export type Estimate = InferSelectModel<typeof estimates>;
export type NewEstimate = InferInsertModel<typeof estimates>;

// 17. INVOICES TABLE
export const invoices = pgTable("invoices", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id).notNull(),
  invoiceNo: varchar("invoice_no", { length: 100 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("unpaid").notNull(),
});

export type Invoice = InferSelectModel<typeof invoices>;
export type NewInvoice = InferInsertModel<typeof invoices>;

// 18. PAYMENTS TABLE
export const payments = pgTable("payments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id).notNull(),
  invoiceId: bigint("invoice_id", { mode: "number" }).references(() => invoices.id).notNull(),
  paymentMode: varchar("payment_mode", { length: 100 }).notNull(),
  transactionRef: varchar("transaction_ref", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("completed").notNull(),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
});

export type Payment = InferSelectModel<typeof payments>;
export type NewPayment = InferInsertModel<typeof payments>;

import { pgTable, bigserial, varchar, text, timestamp, date, boolean, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { services } from "./services.js";
import { users } from "./auth.js";
import { orders } from "./orders.js";

// COMPLIANCE CALENDAR TABLE
export const complianceCalendar = pgTable("compliance_calendar", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  serviceId: bigint("service_id", { mode: "number" }).references(() => services.id),
  title: varchar("title", { length: 255 }).notNull(),
  dueDate: date("due_date").notNull(),
  penalty: text("penalty"),
});

export type ComplianceCalendarEntry = InferSelectModel<typeof complianceCalendar>;
export type NewComplianceCalendarEntry = InferInsertModel<typeof complianceCalendar>;

// 22. NOTIFICATIONS TABLE
export const notifications = pgTable("notifications", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id).notNull(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

// 23. SUPPORT TICKETS TABLE
export const supportTickets = pgTable("support_tickets", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).references(() => users.id).notNull(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: varchar("status", { length: 100 }).default("pending").notNull(),
});

export type SupportTicket = InferSelectModel<typeof supportTickets>;
export type NewSupportTicket = InferInsertModel<typeof supportTickets>;

// 26. TICKET MESSAGES TABLE
export const ticketMessages = pgTable("ticket_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ticketId: bigint("ticket_id", { mode: "number" }).references(() => supportTickets.id).notNull(),
  senderId: bigint("sender_id", { mode: "number" }).references(() => users.id).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TicketMessage = InferSelectModel<typeof ticketMessages>;
export type NewTicketMessage = InferInsertModel<typeof ticketMessages>;

// 24. ACTIVITY LOGS TABLE
export const activityLogs = pgTable("activity_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  recordId: bigint("record_id", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLog = InferSelectModel<typeof activityLogs>;
export type NewActivityLog = InferInsertModel<typeof activityLogs>;

// 25. OTPS TABLE
export const otps = pgTable("otps", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  emailOrPhone: varchar("email_or_phone", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Otp = InferSelectModel<typeof otps>;
export type NewOtp = InferInsertModel<typeof otps>;

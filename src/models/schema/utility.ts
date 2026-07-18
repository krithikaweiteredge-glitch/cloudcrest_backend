import { pgTable, bigserial, varchar, text, timestamp, date, boolean, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { services } from "./services.js";
import { users } from "./auth.js";
import { orders } from "./orders.js";

// 19. KNOWLEDGE CATEGORIES TABLE
export const knowledgeCategories = pgTable("knowledge_categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type KnowledgeCategory = InferSelectModel<typeof knowledgeCategories>;
export type NewKnowledgeCategory = InferInsertModel<typeof knowledgeCategories>;

// 20. KNOWLEDGE ARTICLES TABLE
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  categoryId: bigint("category_id", { mode: "number" }).references(() => knowledgeCategories.id).notNull(),
  serviceId: bigint("service_id", { mode: "number" }).references(() => services.id),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
});

export type KnowledgeArticle = InferSelectModel<typeof knowledgeArticles>;
export type NewKnowledgeArticle = InferInsertModel<typeof knowledgeArticles>;

// 21. COMPLIANCE CALENDAR TABLE
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
  status: varchar("status", { length: 100 }).default("open").notNull(),
});

export type SupportTicket = InferSelectModel<typeof supportTickets>;
export type NewSupportTicket = InferInsertModel<typeof supportTickets>;

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

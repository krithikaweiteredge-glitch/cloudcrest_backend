import { pgTable, bigserial, varchar, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { users } from "./auth.js";

// NOTIFICATIONS TABLE (Public broadcasts when user_id IS NULL; User-specific when user_id is set)
export const notifications = pgTable("notifications", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("broadcast").notNull(),
  linkUrl: varchar("link_url", { length: 550 }),
  isRead: varchar("is_read", { length: 10 }).default("false").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export type NotificationItem = InferSelectModel<typeof notifications>;
export type NewNotificationItem = InferInsertModel<typeof notifications>;

import { pgTable, bigserial, varchar, date, integer, bigint } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { services } from "./services.js";
import { orders } from "./orders.js";
import { users } from "./auth.js";

// 13. WORKFLOWS TABLE
export const workflows = pgTable("workflows", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  serviceId: bigint("service_id", { mode: "number" }).references(() => services.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type Workflow = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;

// 14. WORKFLOW STAGES TABLE
export const workflowStages = pgTable("workflow_stages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  workflowId: bigint("workflow_id", { mode: "number" }).references(() => workflows.id).notNull(),
  stageName: varchar("stage_name", { length: 255 }).notNull(),
  sequence: integer("sequence").notNull(),
});

export type WorkflowStage = InferSelectModel<typeof workflowStages>;
export type NewWorkflowStage = InferInsertModel<typeof workflowStages>;

// 15. TASKS TABLE
export const tasks = pgTable("tasks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id).notNull(),
  stageId: bigint("stage_id", { mode: "number" }).references(() => workflowStages.id).notNull(),
  assignedTo: bigint("assigned_to", { mode: "number" }).references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 100 }).default("pending").notNull(),
  dueDate: date("due_date"),
});

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

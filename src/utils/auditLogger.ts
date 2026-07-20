import { db } from "../config/db.js";
import { activityLogs } from "../models/schema.js";

export async function logActivity(userId: number, action: string, module: string, recordId?: number) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      module,
      recordId: recordId || null,
    });
  } catch (error) {
    console.error("Failed to write audit activity log:", error);
  }
}

import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const datasetsTable = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  privacyStatus: text("privacy_status").notNull().default("unchecked"),
  privacyReport: text("privacy_report"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDatasetSchema = createInsertSchema(datasetsTable).omit({ id: true, createdAt: true, privacyStatus: true, privacyReport: true });
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasetsTable.$inferSelect;

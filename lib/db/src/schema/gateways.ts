import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gatewaysTable = pgTable("gateways", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGatewaySchema = createInsertSchema(gatewaysTable).omit({ id: true, createdAt: true });
export type InsertGateway = z.infer<typeof insertGatewaySchema>;
export type Gateway = typeof gatewaysTable.$inferSelect;

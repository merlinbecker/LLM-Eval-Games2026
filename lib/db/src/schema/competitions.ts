import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { datasetsTable } from "./datasets";

export interface JudgeScoreEntry {
  judgeModelId: string;
  judgeModelName: string;
  score: number;
  reasoning: string;
}

export interface ModelResponseEntry {
  dataItemIndex: number;
  response: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  judgeScores: JudgeScoreEntry[];
}

export interface CompetitionResultEntry {
  modelId: string;
  modelName: string;
  avgSpeed: number;
  avgCost: number;
  avgQuality: number;
  totalTokens: number;
  responses: ModelResponseEntry[];
}

export const competitionsTable = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  datasetId: integer("dataset_id").notNull().references(() => datasetsTable.id),
  systemPrompt: text("system_prompt").notNull(),
  status: text("status").notNull().default("draft"),
  contestantModels: jsonb("contestant_models").notNull().$type<Array<{ gatewayId: number; modelId: string; modelName: string }>>(),
  judgeModels: jsonb("judge_models").notNull().$type<Array<{ gatewayId: number; modelId: string; modelName: string }>>(),
  results: jsonb("results").$type<CompetitionResultEntry[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCompetitionSchema = createInsertSchema(competitionsTable).omit({ id: true, createdAt: true, status: true, results: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitionsTable.$inferSelect;

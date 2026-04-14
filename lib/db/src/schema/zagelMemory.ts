import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const zagelMemoryTable = pgTable("zagel_memory", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  name: text("name"),
  job: text("job"),
  interests: jsonb("interests").$type<string[]>().default([]),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().default({}),
  behaviorRules: jsonb("behavior_rules").$type<string[]>().default([]),
  templates: jsonb("templates").$type<Record<string, unknown>[]>().default([]),
  scenarios: jsonb("scenarios").$type<Record<string, unknown>[]>().default([]),
  mood: text("mood").default("neutral"),
  personality: text("personality").default("playful"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertZagelMemorySchema = createInsertSchema(zagelMemoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZagelMemory = z.infer<typeof insertZagelMemorySchema>;
export type ZagelMemory = typeof zagelMemoryTable.$inferSelect;

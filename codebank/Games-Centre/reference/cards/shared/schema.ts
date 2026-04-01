import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Logs for the "Ledger" requirement (witness only)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // e.g., 'GAME_START', 'GAME_END', 'COLLUSION_DETECTED'
  details: jsonb("details").notNull(),     // Stores competitionId, userIds, reason
  timestamp: timestamp("timestamp").defaultNow(),
});

// Game state persistence (Neon DB - state persistence only)
export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  status: text("status").notNull(), // 'INIT', 'LOBBY', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'ARCHIVED'
  mode: text("mode").notNull(),     // 'practice', 'ai', 'multiplayer'
  serviceLevel: text("service_level").notNull(), // 'A', 'B', 'C'
  players: jsonb("players").notNull(), // Array of user IDs
  winnerId: integer("winner_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Snapshot of the game state for recovery
export const gameSnapshots = pgTable("game_snapshots", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull(),
  state: jsonb("state").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;

// Message types for WebSocket communication
export type WsMessage = 
  | { type: 'JOIN_LOBBY'; competitionId: number; userId: number }
  | { type: 'GAME_ACTION'; competitionId: number; userId: number; action: any }
  | { type: 'CHAT_MESSAGE'; competitionId: number; userId: number; content: string }
  | { type: 'SIGNALING'; competitionId: number; targetId: number; signal: any } // For WebRTC
  | { type: 'STATE_UPDATE'; state: any };

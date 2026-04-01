import { db } from "./db";
import { users, competitions, auditLogs, type User, type InsertUser, type Competition, type InsertCompetition } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createCompetition(comp: InsertCompetition): Promise<Competition>;
  getCompetition(id: number): Promise<Competition | undefined>;
  updateCompetitionStatus(id: number, status: string): Promise<void>;
  
  // "Assets Bus" Mock
  lockAssets(userId: number, amount: number, competitionId: number): Promise<string>;
  settleCompetition(competitionId: number, winnerId: number, amount: number): Promise<string>;
  
  // Audit Ledger
  logEvent(eventType: string, details: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createCompetition(comp: InsertCompetition): Promise<Competition> {
    const [competition] = await db.insert(competitions).values(comp).returning();
    return competition;
  }

  async getCompetition(id: number): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    return competition;
  }

  async updateCompetitionStatus(id: number, status: string): Promise<void> {
    await db.update(competitions).set({ status }).where(eq(competitions.id, id));
  }

  async lockAssets(userId: number, amount: number, competitionId: number): Promise<string> {
    // MOCK: In a real system, this calls the external Assets Bus
    const lockId = `lock_${Date.now()}_${userId}`;
    await this.logEvent("ASSET_LOCK", { userId, amount, competitionId, lockId });
    return lockId;
  }

  async settleCompetition(competitionId: number, winnerId: number, amount: number): Promise<string> {
    // MOCK: In a real system, this calls the external Assets Bus
    const txId = `tx_${Date.now()}_${winnerId}`;
    await this.logEvent("ASSET_SETTLE", { competitionId, winnerId, amount, txId });
    return txId;
  }

  async logEvent(eventType: string, details: any): Promise<void> {
    await db.insert(auditLogs).values({
      eventType,
      details,
    });
  }
}

export const storage = new DatabaseStorage();

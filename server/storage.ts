import { tokens, type Token, type InsertToken } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createToken(token: InsertToken): Promise<Token>;
  getTokensByWallet(walletAddress: string): Promise<Token[]>;
  getTokenById(id: string): Promise<Token | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createToken(insertToken: InsertToken): Promise<Token> {
    const [token] = await db
      .insert(tokens)
      .values(insertToken)
      .returning();
    return token;
  }

  async getTokensByWallet(walletAddress: string): Promise<Token[]> {
    return await db
      .select()
      .from(tokens)
      .where(eq(tokens.walletAddress, walletAddress))
      .orderBy(desc(tokens.deployedAt));
  }

  async getTokenById(id: string): Promise<Token | undefined> {
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id));
    return token || undefined;
  }
}

export const storage = new DatabaseStorage();

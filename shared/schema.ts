import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  tokenName: text("token_name").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  contractAddress: text("contract_address").notNull(),
  chainId: integer("chain_id").notNull(),
  decimals: integer("decimals").notNull(),
  deployedAt: timestamp("deployed_at").notNull().defaultNow(),
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  deployedAt: true,
});

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;

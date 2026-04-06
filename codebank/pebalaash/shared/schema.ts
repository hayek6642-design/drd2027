import { pgTable, text, serial, integer, timestamp, uuid, bigint, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id:       uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().default("guest"),
  password: text("password"),
});

export const wallets = pgTable("wallets", {
  userId:        uuid("user_id").primaryKey().references(() => users.id),
  codes:         bigint("codes",          { mode: "number" }).notNull().default(5000),
  silver:        bigint("silver",         { mode: "number" }).notNull().default(0),
  gold:          bigint("gold",           { mode: "number" }).notNull().default(0),
  balloonPoints: bigint("balloon_points", { mode: "number" }).notNull().default(0),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull().unique(),
  slug:      text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  priceCodes:  integer("price_codes").notNull(),
  priceSilver: integer("price_silver").notNull().default(0),
  priceGold:   integer("price_gold").notNull().default(0),
  imageUrl:    text("image_url").notNull(),
  categoryId:  integer("category_id").notNull().references(() => categories.id),
  countryCode: text("country_code").notNull().default("ALL"),
  stock:       integer("stock").notNull().default(0),
  soldCount:   integer("sold_count").notNull().default(0),
  avgRating:   doublePrecision("avg_rating").default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt:   timestamp("created_at").defaultNow(),
});

export const ratings = pgTable("pebalaash_ratings", {
  id:        serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  userId:    uuid("user_id").notNull(),
  rating:    integer("rating").notNull(),
  review:    text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id:          serial("id").primaryKey(),
  userId:      uuid("user_id").notNull().references(() => users.id),
  productId:   integer("product_id").notNull().references(() => products.id),
  customerInfo: jsonb("customer_info").$type<{
    name: string; phone: string; address: string; email?: string; notes?: string;
  }>().notNull(),
  status:      text("status").notNull().default("completed"),
  paymentType: text("payment_type").notNull().default("codes"),
  amountPaid:  integer("amount_paid").notNull(),
  totalCodes:  integer("total_codes").notNull(),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ── Balloon Points Log ──────────────────────────────────────────────────────
export const balloonLogs = pgTable("balloon_logs", {
  id:        serial("id").primaryKey(),
  userId:    uuid("user_id").notNull(),
  amount:    integer("amount").notNull(),
  optionKey: text("option_key"),
  newTotal:  bigint("new_total", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema  = createInsertSchema(products).omit({ id: true, soldCount: true, createdAt: true, avgRating: true, ratingCount: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });

export type User        = typeof users.$inferSelect;
export type Wallet      = typeof wallets.$inferSelect;
export type Category    = typeof categories.$inferSelect;
export type Product     = typeof products.$inferSelect;
export type Order       = typeof orders.$inferSelect;
export type BalloonLog  = typeof balloonLogs.$inferSelect;
export type InsertProduct  = z.infer<typeof insertProductSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type AdminStats = {
  totalSold: number; totalRevenueCodes: number; recentOrders: any[]; lowStockProducts: any[];
};
export type BalloonAdminStats = {
  totalEvents:    number;
  topUsers:       { userId: string; totalPoints: number }[];
  recentActivity: BalloonLog[];
};

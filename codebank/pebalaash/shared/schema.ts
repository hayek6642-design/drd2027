import { pgTable, text, serial, integer, timestamp, uuid, bigint, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Guest User (Single shared user for demo)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().default("guest"),
  password: text("password"), // Keep for backward compatibility
});

// Wallets
export const wallets = pgTable("wallets", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  codes: bigint("codes", { mode: "number" }).notNull().default(5000),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products (Priced in codes, with categories)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceCodes: integer("price_codes").notNull(),
  imageUrl: text("image_url").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  stock: integer("stock").notNull().default(0),
  soldCount: integer("sold_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  customerInfo: jsonb("customer_info").$type<{
    name: string;
    phone: string;
    address: string;
    notes?: string;
  }>().notNull(),
  status: text("status").notNull().default("completed"),
  totalCodes: integer("total_codes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  soldCount: true, 
  createdAt: true 
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});

// === TYPES ===
export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type AdminStats = {
  totalSold: number;
  totalRevenueCodes: number;
  recentOrders: any[];
  lowStockProducts: any[];
};

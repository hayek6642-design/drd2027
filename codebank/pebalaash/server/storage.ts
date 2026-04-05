import { db } from "./db";
import {
  users, wallets, categories, products, orders, ratings,
  type User, type Wallet, type Category, type Product, type Order,
  type InsertProduct, type InsertCategory, type AdminStats
} from "@shared/schema";
import { eq, sql, desc, and, isNull, or } from "drizzle-orm";

const GUEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export interface IStorage {
  getOrCreateGuestUser(): Promise<User>;
  getWallet(userId: string): Promise<Wallet | undefined>;
  updateWalletCodes(userId: string, newBalance: number): Promise<void>;
  updateWalletField(userId: string, field: 'codes' | 'silver' | 'gold', newBalance: number): Promise<void>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  getProducts(categoryId?: number, countryCode?: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  decrementStock(productId: number): Promise<void>;
  createOrder(order: any): Promise<Order>;
  getOrders(userId: string): Promise<any[]>;
  getAdminStats(): Promise<AdminStats>;
  addRating(productId: number, userId: string, rating: number, review?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getOrCreateGuestUser(): Promise<User> {
    let [user] = await db.select().from(users).where(eq(users.id, GUEST_USER_ID));
    if (!user) {
      [user] = await db.insert(users).values({ id: GUEST_USER_ID, username: "guest" }).returning();
      await db.insert(wallets).values({ userId: GUEST_USER_ID, codes: 5000, silver: 0, gold: 0 });
    } else {
      // ensure wallet exists
      const [w] = await db.select().from(wallets).where(eq(wallets.userId, GUEST_USER_ID));
      if (!w) await db.insert(wallets).values({ userId: GUEST_USER_ID, codes: 5000, silver: 0, gold: 0 });
    }
    return user;
  }

  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [w] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return w;
  }

  async updateWalletCodes(userId: string, newBalance: number): Promise<void> {
    await db.update(wallets).set({ codes: newBalance, updatedAt: new Date() }).where(eq(wallets.userId, userId));
  }

  async updateWalletField(userId: string, field: 'codes' | 'silver' | 'gold', newBalance: number): Promise<void> {
    const payload: any = { updatedAt: new Date() };
    payload[field] = newBalance;
    await db.update(wallets).set(payload).where(eq(wallets.userId, userId));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [c] = await db.insert(categories).values(category).returning();
    return c;
  }

  async getProducts(categoryId?: number, countryCode?: string): Promise<Product[]> {
    let query = db.select().from(products).$dynamic();
    const conditions = [];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (countryCode && countryCode !== "ALL") {
      conditions.push(or(eq(products.countryCode, countryCode), eq(products.countryCode, "ALL")));
    }
    if (conditions.length) query = query.where(and(...conditions) as any);
    return await query;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const payload = {
      ...product,
      priceSilver: product.priceSilver ?? Math.ceil((product.priceCodes ?? 0) / 100),
      priceGold:   product.priceGold   ?? Math.ceil((product.priceCodes ?? 0) / 10000) || 1,
      countryCode: product.countryCode ?? "ALL",
    };
    const [p] = await db.insert(products).values(payload).returning();
    return p;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [p] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return p;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async decrementStock(productId: number): Promise<void> {
    await db.update(products).set({
      stock:     sql`${products.stock} - 1`,
      soldCount: sql`${products.soldCount} + 1`,
    }).where(eq(products.id, productId));
  }

  async createOrder(orderData: any): Promise<Order> {
    const [o] = await db.insert(orders).values(orderData).returning();
    return o;
  }

  async getOrders(userId: string): Promise<any[]> {
    return await db.select({
      id:          orders.id,
      productId:   orders.productId,
      productName: products.name,
      paymentType: orders.paymentType,
      amountPaid:  orders.amountPaid,
      priceCodes:  products.priceCodes,
      status:      orders.status,
      createdAt:   orders.createdAt,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  }

  async getAdminStats(): Promise<AdminStats> {
    const allOrders = await db.select({
      id: orders.id, userId: orders.userId, productId: orders.productId,
      customerInfo: orders.customerInfo, status: orders.status,
      totalCodes: orders.totalCodes, createdAt: orders.createdAt, productName: products.name,
    })
    .from(orders).leftJoin(products, eq(orders.productId, products.id))
    .orderBy(desc(orders.createdAt)).limit(50);

    const [{ count }]  = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const [{ sum }]    = await db.select({ sum: sql<number>`coalesce(sum(${orders.totalCodes}), 0)` }).from(orders);
    const lowStock     = await db.select().from(products).where(sql`${products.stock} < 5`);

    return {
      totalSold: Number(count ?? 0),
      totalRevenueCodes: Number(sum ?? 0),
      recentOrders: allOrders as any,
      lowStockProducts: lowStock,
    };
  }

  async addRating(productId: number, userId: string, rating: number, review?: string): Promise<void> {
    // upsert: delete existing then insert
    await db.delete(ratings).where(and(eq(ratings.productId, productId), eq(ratings.userId, userId)));
    await db.insert(ratings).values({ productId, userId, rating, review });
    // recalculate avg
    const [{ avg, cnt }] = await db.select({
      avg: sql<number>`avg(${ratings.rating})`,
      cnt: sql<number>`count(*)`,
    }).from(ratings).where(eq(ratings.productId, productId));
    await db.update(products).set({
      avgRating:   Number(avg ?? 0),
      ratingCount: Number(cnt ?? 0),
    }).where(eq(products.id, productId));
  }
}

export const storage = new DatabaseStorage();

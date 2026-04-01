import { db } from "./db";
import {
  users, wallets, categories, products, orders,
  type User, type Wallet, type Category, type Product, type Order,
  type InsertProduct, type InsertCategory, type AdminStats
} from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Guest user
  getOrCreateGuestUser(): Promise<User>;
  
  // Wallet
  getWallet(userId: string): Promise<Wallet | undefined>;
  updateWalletCodes(userId: string, newBalance: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Products
  getProducts(categoryId?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  decrementStock(productId: number): Promise<void>;

  // Orders
  createOrder(order: any): Promise<Order>;
  getAdminStats(): Promise<AdminStats>;
}

const GUEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"; // Fixed guest ID

export class DatabaseStorage implements IStorage {
  async getOrCreateGuestUser(): Promise<User> {
    let [user] = await db.select().from(users).where(eq(users.id, GUEST_USER_ID));
    
    if (!user) {
      [user] = await db.insert(users).values({
        id: GUEST_USER_ID,
        username: "guest"
      }).returning();
      
      await db.insert(wallets).values({
        userId: GUEST_USER_ID,
        codes: 5000
      });
    }
    
    return user;
  }

  // Wallet methods
  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async updateWalletCodes(userId: string, newBalance: number): Promise<void> {
    await db.update(wallets)
      .set({ codes: newBalance, updatedAt: new Date() })
      .where(eq(wallets.userId, userId));
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Product methods
  async getProducts(categoryId?: number): Promise<Product[]> {
    if (categoryId) {
      return await db.select().from(products).where(eq(products.categoryId, categoryId));
    }
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async decrementStock(productId: number): Promise<void> {
    await db.update(products)
      .set({ 
        stock: sql`${products.stock} - 1`,
        soldCount: sql`${products.soldCount} + 1`
      })
      .where(eq(products.id, productId));
  }

  // Order methods
  async createOrder(orderData: any): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async getAdminStats(): Promise<AdminStats> {
    const allOrders = await db.select({
      id: orders.id,
      userId: orders.userId,
      productId: orders.productId,
      customerInfo: orders.customerInfo,
      status: orders.status,
      totalCodes: orders.totalCodes,
      createdAt: orders.createdAt,
      productName: products.name,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);

    const totalSoldResult = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const totalRevenueResult = await db.select({ sum: sql<number>`sum(${orders.totalCodes})` }).from(orders);
    const lowStock = await db.select().from(products).where(sql`${products.stock} < 5`);

    return {
      totalSold: Number(totalSoldResult[0]?.count || 0),
      totalRevenueCodes: Number(totalRevenueResult[0]?.sum || 0),
      recentOrders: allOrders as any,
      lowStockProducts: lowStock
    };
  }
}

export const storage = new DatabaseStorage();

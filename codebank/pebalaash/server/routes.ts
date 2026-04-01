import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const GUEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Ensure guest user exists
  await storage.getOrCreateGuestUser();

  // --- Category Routes ---
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  // --- Product Routes ---
  app.get(api.products.list.path, async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const prods = await storage.getProducts(categoryId);
    res.json(prods);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  // --- Wallet Routes ---
  app.get(api.wallet.get.path, async (req, res) => {
    const wallet = await storage.getWallet(GUEST_USER_ID);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json({ userId: GUEST_USER_ID, codes: wallet.codes });
  });

  // --- Checkout Route ---
  app.post(api.checkout.purchase.path, async (req, res) => {
    try {
      const { productId, customerInfo } = req.body;
      
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      if (product.stock <= 0) return res.status(400).json({ message: "Out of stock" });

      const wallet = await storage.getWallet(GUEST_USER_ID);
      if (!wallet || wallet.codes < product.priceCodes) {
        return res.status(400).json({ message: "Insufficient codes balance" });
      }

      // Process transaction
      const newBalance = wallet.codes - product.priceCodes;
      await storage.updateWalletCodes(GUEST_USER_ID, newBalance);
      await storage.decrementStock(productId);
      await storage.createOrder({
        userId: GUEST_USER_ID,
        productId,
        customerInfo,
        totalCodes: product.priceCodes,
        status: "completed"
      });

      res.json({ success: true, remainingCodes: newBalance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Transaction failed" });
    }
  });

  // --- Admin Routes ---
  app.get(api.admin.stats.path, async (req, res) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  // --- Seeding ---
  await seedData();

  return httpServer;
}

async function seedData() {
  const existingCats = await storage.getCategories();
  if (existingCats.length === 0) {
    console.log("Seeding categories and products...");
    
    const categories = [
      { name: "Cosmetics", slug: "cosmetics" },
      { name: "Women", slug: "women" },
      { name: "Men", slug: "men" },
      { name: "Kids", slug: "kids" },
      { name: "Toys", slug: "toys" },
    ];

    const savedCats = await Promise.all(categories.map(cat => storage.createCategory(cat)));

    const products = [
      // Cosmetics
      { name: "Luxury Lipstick", description: "Premium shade with long-lasting formula", priceCodes: 250, categoryId: savedCats[0].id, stock: 30, imageUrl: "https://images.unsplash.com/photo-1599305445671-07d54f46f3cb?w=800&auto=format&fit=crop&q=60" },
      { name: "Face Serum", description: "Hydrating serum with vitamin C", priceCodes: 400, categoryId: savedCats[0].id, stock: 20, imageUrl: "https://images.unsplash.com/photo-1596924519407-c6978cc4e067?w=800&auto=format&fit=crop&q=60" },
      { name: "Mascara Set", description: "3-piece mascara collection", priceCodes: 350, categoryId: savedCats[0].id, stock: 25, imageUrl: "https://images.unsplash.com/photo-1512207736139-c20992ff0710?w=800&auto=format&fit=crop&q=60" },
      
      // Women
      { name: "Designer Handbag", description: "Elegant leather handbag", priceCodes: 1200, categoryId: savedCats[1].id, stock: 10, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=60" },
      { name: "Silk Scarf", description: "Premium 100% silk scarf", priceCodes: 300, categoryId: savedCats[1].id, stock: 50, imageUrl: "https://images.unsplash.com/photo-1595777707802-07e4b8046b2b?w=800&auto=format&fit=crop&q=60" },
      { name: "Women's Sunglasses", description: "UV protection sunglasses", priceCodes: 450, categoryId: savedCats[1].id, stock: 35, imageUrl: "https://images.unsplash.com/photo-1559937686-56c5e5b7c3a2?w=800&auto=format&fit=crop&q=60" },
      
      // Men
      { name: "Watch Elite", description: "Luxury analog watch", priceCodes: 2000, categoryId: savedCats[2].id, stock: 8, imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&auto=format&fit=crop&q=60" },
      { name: "Leather Belt", description: "Premium Italian leather belt", priceCodes: 350, categoryId: savedCats[2].id, stock: 40, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=60" },
      { name: "Men's Cologne", description: "Signature fragrance", priceCodes: 280, categoryId: savedCats[2].id, stock: 60, imageUrl: "https://images.unsplash.com/photo-1585286885021-ce9ee1ce5fcc?w=800&auto=format&fit=crop&q=60" },
      
      // Kids
      { name: "Kids Backpack", description: "Colorful school backpack", priceCodes: 150, categoryId: savedCats[3].id, stock: 80, imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=60" },
      { name: "Kids Watch", description: "Digital adventure watch", priceCodes: 120, categoryId: savedCats[3].id, stock: 70, imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&auto=format&fit=crop&q=60" },
      
      // Toys
      { name: "Robot Toy", description: "Interactive robot with sounds", priceCodes: 450, categoryId: savedCats[4].id, stock: 25, imageUrl: "https://images.unsplash.com/photo-1594787318286-3d835c1cab83?w=800&auto=format&fit=crop&q=60" },
      { name: "Building Blocks Set", description: "1000 piece construction set", priceCodes: 350, categoryId: savedCats[4].id, stock: 40, imageUrl: "https://images.unsplash.com/photo-1577720643272-265fba8a3faa?w=800&auto=format&fit=crop&q=60" },
      { name: "Board Game Deluxe", description: "Premium family board game", priceCodes: 200, categoryId: savedCats[4].id, stock: 55, imageUrl: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&auto=format&fit=crop&q=60" },
    ];

    await Promise.all(products.map(prod => storage.createProduct(prod)));
  }
}

import type { Express } from "express";
import { storage } from "./storage";
import { insertProductSchema, insertCategorySchema } from "@shared/schema";
import { PEBALAASH_API } from "@shared/routes";

const GUEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADMIN_PASSWORD = process.env.PEBALAASH_ADMIN_PASSWORD ?? "pebalaash_admin_2024";

// ── Rate limiter for balloon pops (per IP) ──────────────────────────────────
const popCooldowns = new Map<string, number>();
const POP_COOLDOWN_MS = 300; // 300ms minimum between pops

function adminAuth(req: any, res: any, next: any) {
  const pw = req.headers["x-admin-password"];
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function registerRoutes(app: Express) {
  // Ensure guest user exists
  app.use("/api/pebalaash", async (_req, _res, next) => {
    try { await storage.getOrCreateGuestUser(); } catch (_) {}
    next();
  });

  // ── Wallet ────────────────────────────────────────────────────────────────
  app.get(PEBALAASH_API.wallet, async (req, res) => {
    try {
      const wallet = await storage.getWallet(GUEST_USER_ID);
      res.json(wallet ?? { userId: GUEST_USER_ID, codes: 5000, silver: 0, gold: 0, balloonPoints: 0 });
    } catch (err) { res.status(500).json({ error: "Failed to fetch wallet" }); }
  });

  // ── Balloon Points: get current total ────────────────────────────────────
  app.get("/api/pebalaash/balloon/points", async (_req, res) => {
    try {
      const wallet = await storage.getWallet(GUEST_USER_ID);
      res.json({ balloonPoints: Number(wallet?.balloonPoints ?? 0) });
    } catch (err) { res.status(500).json({ error: "Failed to fetch points" }); }
  });

  // ── Balloon Points: pop a balloon option ─────────────────────────────────
  app.post("/api/pebalaash/balloon/pop", async (req, res) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.socket.remoteAddress ?? "unknown";
      const now = Date.now();
      const last = popCooldowns.get(ip) ?? 0;
      if (now - last < POP_COOLDOWN_MS) {
        return res.status(429).json({ error: "Too fast" });
      }
      popCooldowns.set(ip, now);

      const { points = 0, optionKey } = req.body;
      const pointsNum = Math.min(Math.max(Number(points), 0), 100); // cap at 100 per pop

      const newTotal = await storage.addBalloonPoints(GUEST_USER_ID, pointsNum, optionKey);
      res.json({ success: true, points: pointsNum, newTotal });
    } catch (err) { res.status(500).json({ error: "Failed to add points" }); }
  });

  // ── Admin: balloon stats ──────────────────────────────────────────────────
  app.get("/api/pebalaash/admin/balloon-stats", adminAuth, async (_req, res) => {
    try {
      const stats = await storage.getBalloonAdminStats();
      res.json(stats);
    } catch (err) { res.status(500).json({ error: "Failed to fetch balloon stats" }); }
  });

  // ── Categories ────────────────────────────────────────────────────────────
  app.get(PEBALAASH_API.categories, async (_req, res) => {
    try { res.json(await storage.getCategories()); }
    catch (err) { res.status(500).json({ error: "Failed to fetch categories" }); }
  });

  app.post("/api/pebalaash/admin/categories", adminAuth, async (req, res) => {
    try {
      const parsed = insertCategorySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error });
      res.json(await storage.createCategory(parsed.data));
    } catch (err) { res.status(500).json({ error: "Failed to create category" }); }
  });

  // ── Products ──────────────────────────────────────────────────────────────
  app.get(PEBALAASH_API.products, async (req, res) => {
    try {
      const categoryId  = req.query.categoryId  ? Number(req.query.categoryId)    : undefined;
      const countryCode = req.query.countryCode  ? String(req.query.countryCode)   : undefined;
      res.json(await storage.getProducts(categoryId, countryCode));
    } catch (err) { res.status(500).json({ error: "Failed to fetch products" }); }
  });

  app.get("/api/pebalaash/products/:id", async (req, res) => {
    const p = await storage.getProduct(Number(req.params.id));
    p ? res.json(p) : res.status(404).json({ error: "Not found" });
  });

  // ── Admin: Products CRUD ──────────────────────────────────────────────────
  app.get("/api/pebalaash/admin/products", adminAuth, async (_req, res) => {
    try { res.json(await storage.getProducts()); }
    catch { res.status(500).json({ error: "Failed" }); }
  });

  app.post("/api/pebalaash/admin/products", adminAuth, async (req, res) => {
    try {
      const parsed = insertProductSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid", details: parsed.error });
      res.json(await storage.createProduct(parsed.data));
    } catch { res.status(500).json({ error: "Failed" }); }
  });

  app.put("/api/pebalaash/admin/products/:id", adminAuth, async (req, res) => {
    try { res.json(await storage.updateProduct(Number(req.params.id), req.body)); }
    catch { res.status(500).json({ error: "Failed" }); }
  });

  app.delete("/api/pebalaash/admin/products/:id", adminAuth, async (req, res) => {
    try { await storage.deleteProduct(Number(req.params.id)); res.json({ ok: true }); }
    catch { res.status(500).json({ error: "Failed" }); }
  });

  // ── Admin: Auth ───────────────────────────────────────────────────────────
  app.post("/api/pebalaash/admin/auth", async (req, res) => {
    const { password } = req.body;
    password === ADMIN_PASSWORD
      ? res.json({ ok: true })
      : res.status(401).json({ error: "Wrong password" });
  });

  // ── Admin: Stats ──────────────────────────────────────────────────────────
  app.get("/api/pebalaash/admin/stats", adminAuth, async (_req, res) => {
    try { res.json(await storage.getAdminStats()); }
    catch { res.status(500).json({ error: "Failed" }); }
  });

  // ── Orders ────────────────────────────────────────────────────────────────
  app.post(PEBALAASH_API.orders, async (req, res) => {
    try {
      const { productId, customerInfo, paymentType = "codes" } = req.body;
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ error: "Product not found" });
      if (product.stock <= 0) return res.status(400).json({ error: "Out of stock" });

      const wallet = await storage.getWallet(GUEST_USER_ID);
      if (!wallet) return res.status(400).json({ error: "Wallet not found" });

      let amountPaid = 0;
      let totalCodes = 0;

      if (paymentType === "codes") {
        amountPaid = product.priceCodes;
        totalCodes = product.priceCodes;
        if (wallet.codes < product.priceCodes) return res.status(400).json({ error: "Insufficient codes" });
        await storage.updateWalletCodes(GUEST_USER_ID, Number(wallet.codes) - product.priceCodes);
      } else if (paymentType === "silver") {
        amountPaid = product.priceSilver;
        totalCodes = product.priceCodes;
        if (wallet.silver < product.priceSilver) return res.status(400).json({ error: "Insufficient silver" });
        await storage.updateWalletField(GUEST_USER_ID, "silver", Number(wallet.silver) - product.priceSilver);
      } else if (paymentType === "gold") {
        amountPaid = product.priceGold;
        totalCodes = product.priceCodes;
        if (wallet.gold < product.priceGold) return res.status(400).json({ error: "Insufficient gold" });
        await storage.updateWalletField(GUEST_USER_ID, "gold", Number(wallet.gold) - product.priceGold);
      }

      const order = await storage.createOrder({
        userId: GUEST_USER_ID, productId, customerInfo,
        status: "completed", paymentType, amountPaid, totalCodes,
      });

      await storage.decrementStock(productId);
      res.json(order);
    } catch (err) { res.status(500).json({ error: "Order failed" }); }
  });

  app.get(PEBALAASH_API.orders, async (_req, res) => {
    try { res.json(await storage.getOrders(GUEST_USER_ID)); }
    catch { res.status(500).json({ error: "Failed" }); }
  });

  // ── Ratings ───────────────────────────────────────────────────────────────
  app.post("/api/pebalaash/ratings", async (req, res) => {
    try {
      const { productId, rating, review } = req.body;
      if (!productId || !rating) return res.status(400).json({ error: "productId and rating required" });
      await storage.addRating(Number(productId), GUEST_USER_ID, Number(rating), review);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "Failed" }); }
  });
}

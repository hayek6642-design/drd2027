import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";

const GUEST_USER_ID  = "550e8400-e29b-41d4-a716-446655440000";
const ADMIN_PASSWORD = process.env.PEBALAASH_ADMIN_PASSWORD ?? "pebalaash-admin-2027";

// ── Rate limiter for balloon pops (per IP) ──────────────────────────────────
const popCooldowns = new Map<string, number>();
const POP_COOLDOWN_MS = 300;

function adminAuth(req: any, res: any, next: any) {
  const pw = req.headers["x-admin-password"] || req.query.adminPw;
  if (!pw || pw !== ADMIN_PASSWORD) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await storage.getOrCreateGuestUser();

  // ── Middleware: ensure guest user exists ─────────────────────────────────
  // (already done above, just re-ensure on each request via getOrCreateGuestUser in storage)

  // ── Categories ────────────────────────────────────────────────────────────
  app.get(api.categories.list.path, async (_req, res) => {
    try { res.json(await storage.getCategories()); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/pebalaash/admin/categories", adminAuth, async (req, res) => {
    try { res.json(await storage.createCategory(req.body)); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Products ──────────────────────────────────────────────────────────────
  app.get(api.products.list.path, async (req, res) => {
    const categoryId  = req.query.categoryId  ? Number(req.query.categoryId)  : undefined;
    const countryCode = req.query.countryCode  ? String(req.query.countryCode) : undefined;
    res.json(await storage.getProducts(categoryId, countryCode));
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.get("/api/pebalaash/admin/products", adminAuth, async (_req, res) => {
    res.json(await storage.getProducts());
  });

  app.post("/api/pebalaash/admin/products", adminAuth, async (req, res) => {
    try { res.json(await storage.createProduct(req.body)); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put("/api/pebalaash/admin/products/:id", adminAuth, async (req, res) => {
    try { res.json(await storage.updateProduct(Number(req.params.id), req.body)); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/pebalaash/admin/products/:id", adminAuth, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Ratings ───────────────────────────────────────────────────────────────
  app.post("/api/pebalaash/products/:id/ratings", async (req, res) => {
    try {
      const { rating, review } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Invalid rating" });
      await storage.addRating(Number(req.params.id), GUEST_USER_ID, rating, review);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Wallet ────────────────────────────────────────────────────────────────
  app.get(api.wallet.get.path, async (_req, res) => {
    try {
      const wallet = await storage.getWallet(GUEST_USER_ID);
      if (!wallet) return res.status(404).json({ message: "Wallet not found" });
      res.json({
        userId:        GUEST_USER_ID,
        codes:         Number(wallet.codes         ?? 0),
        silver:        Number(wallet.silver        ?? 0),
        gold:          Number(wallet.gold          ?? 0),
        balloonPoints: Number(wallet.balloonPoints ?? 0),
      });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // ── Balloon Points ────────────────────────────────────────────────────────
  app.get("/api/pebalaash/balloon/points", async (_req, res) => {
    try {
      const wallet = await storage.getWallet(GUEST_USER_ID);
      res.json({ balloonPoints: Number(wallet?.balloonPoints ?? 0) });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/pebalaash/balloon/pop", async (req, res) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.socket.remoteAddress ?? "anon";
      const now = Date.now();
      const last = popCooldowns.get(ip) ?? 0;
      if (now - last < POP_COOLDOWN_MS) return res.status(429).json({ message: "Too fast" });
      popCooldowns.set(ip, now);

      const points    = Math.min(Math.max(Number(req.body.points ?? 0), 0), 100);
      const optionKey = req.body.optionKey as string | undefined;
      const newTotal  = await storage.addBalloonPoints(GUEST_USER_ID, points, optionKey);
      res.json({ success: true, points, newTotal });
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  // ── Admin: Balloon Stats ──────────────────────────────────────────────────
  app.get("/api/pebalaash/admin/balloon-stats", adminAuth, async (_req, res) => {
    try { res.json(await storage.getBalloonAdminStats()); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  // ── Checkout (purchase) ───────────────────────────────────────────────────
  app.post(api.checkout.purchase.path, async (req, res) => {
    try {
      const { productId, customerInfo, paymentType = "codes" } = req.body;
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      if (product.stock <= 0) return res.status(400).json({ message: "Out of stock" });

      const wallet = await storage.getWallet(GUEST_USER_ID);
      if (!wallet) return res.status(404).json({ message: "Wallet not found" });

      let required = product.priceCodes;
      let field: "codes" | "silver" | "gold" = "codes";
      if (paymentType === "silver") { required = product.priceSilver; field = "silver"; }
      if (paymentType === "gold")   { required = product.priceGold;   field = "gold";   }

      const balance =
        paymentType === "silver" ? Number(wallet.silver) :
        paymentType === "gold"   ? Number(wallet.gold)   :
                                   Number(wallet.codes);

      if (balance < required) {
        return res.status(400).json({ message: `Insufficient ${paymentType}. Need ${required}, have ${balance}` });
      }

      await storage.updateWalletField(GUEST_USER_ID, field, balance - required);
      await storage.decrementStock(productId);
      await storage.createOrder({
        userId: GUEST_USER_ID, productId, customerInfo,
        paymentType, amountPaid: required, totalCodes: product.priceCodes, status: "completed",
      });

      res.json({ success: true, amountPaid: required, paymentType });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: "Transaction failed" });
    }
  });

  // ── Orders history ────────────────────────────────────────────────────────
  app.get("/api/pebalaash/orders", async (_req, res) => {
    const orderList = await storage.getOrders(GUEST_USER_ID);
    res.json({ orders: orderList, total: orderList.length });
  });

  // ── Wallet items (stub — gifting system placeholder) ─────────────────────
  app.get(api.walletItems.list.path, async (_req, res) => {
    res.json([]); // gifting system not yet implemented server-side
  });

  app.post(api.walletItems.gift.path.replace(":id", ":id"), adminAuth, async (req, res) => {
    res.status(501).json({ message: "Gifting not yet implemented" });
  });

  // ── Users search (stub) ───────────────────────────────────────────────────
  app.get(api.usersSearch.search.path, async (req, res) => {
    res.json([]); // user search placeholder
  });

  // ── Admin auth ────────────────────────────────────────────────────────────
  app.post("/api/pebalaash/admin/auth", (req, res) => {
    const { password } = req.body;
    password === ADMIN_PASSWORD ? res.json({ ok: true }) : res.status(401).json({ message: "Wrong password" });
  });

  // ── Admin stats ───────────────────────────────────────────────────────────
  app.get(api.admin.stats.path, adminAuth, async (_req, res) => {
    try { res.json(await storage.getAdminStats()); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  // ── Seed on first run ─────────────────────────────────────────────────────
  await seedData();

  return httpServer;
}

async function seedData() {
  const existingCats = await storage.getCategories();
  if (existingCats.length > 0) return;

  console.log("[Pebalaash] Seeding categories and products...");

  const catDefs = [
    { name: "Cosmetics", slug: "cosmetics" },
    { name: "Women",     slug: "women"     },
    { name: "Men",       slug: "men"       },
    { name: "Kids",      slug: "kids"      },
    { name: "Toys",      slug: "toys"      },
    { name: "Tech",      slug: "tech"      },
    { name: "Food",      slug: "food"      },
  ];

  const cats = await Promise.all(catDefs.map(c => storage.createCategory(c)));
  const [cosId, wId, mId, _kId, tId, techId, foodId] = cats.map(c => c.id);

  const prods = [
    { name: "Luxury Lipstick",      description: "Premium shade, long-lasting formula",  priceCodes: 250,  categoryId: cosId,  countryCode: "ALL", stock: 30, imageUrl: "https://images.unsplash.com/photo-1599305445671-07d54f46f3cb?w=800&q=60" },
    { name: "Face Serum",           description: "Hydrating serum with vitamin C",        priceCodes: 400,  categoryId: cosId,  countryCode: "ALL", stock: 20, imageUrl: "https://images.unsplash.com/photo-1596924519407-c6978cc4e067?w=800&q=60" },
    { name: "Designer Handbag",     description: "Elegant leather handbag",               priceCodes: 1200, categoryId: wId,    countryCode: "ALL", stock: 10, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=60" },
    { name: "Watch Elite",          description: "Luxury analog watch",                   priceCodes: 2000, categoryId: mId,    countryCode: "ALL", stock: 8,  imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=60" },
    { name: "Building Blocks Set",  description: "1000-piece construction set",           priceCodes: 350,  categoryId: tId,    countryCode: "ALL", stock: 40, imageUrl: "https://images.unsplash.com/photo-1577720643272-265fba8a3faa?w=800&q=60" },
    { name: "Egyptian Cotton Sheets", description: "Thread count 1200, ultra-soft",       priceCodes: 600,  categoryId: wId,    countryCode: "EG",  stock: 25, imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=60" },
    { name: "Karkadé Luxury Tea",   description: "Premium hibiscus blend",                priceCodes: 80,   categoryId: foodId, countryCode: "EG",  stock: 100,imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca3d9cde4?w=800&q=60" },
    { name: "Pharaoh Cologne",      description: "Inspired by ancient Egypt",             priceCodes: 320,  categoryId: mId,    countryCode: "EG",  stock: 50, imageUrl: "https://images.unsplash.com/photo-1585286885021-ce9ee1ce5fcc?w=800&q=60" },
    { name: "Oud Perfume",          description: "Authentic Saudi Oud fragrance",         priceCodes: 900,  categoryId: mId,    countryCode: "SA",  stock: 20, imageUrl: "https://images.unsplash.com/photo-1585286885021-ce9ee1ce5fcc?w=800&q=60" },
    { name: "Abaya Premium",        description: "Hand-embroidered luxury abaya",         priceCodes: 750,  categoryId: wId,    countryCode: "SA",  stock: 15, imageUrl: "https://images.unsplash.com/photo-1595777707802-07e4b8046b2b?w=800&q=60" },
    { name: "Saudi Dates Box",      description: "Premium Medjool dates, 1kg",            priceCodes: 150,  categoryId: foodId, countryCode: "SA",  stock: 80, imageUrl: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=60" },
    { name: "Gold Plated Cufflinks",description: "24k gold plated, handcrafted",          priceCodes: 1500, categoryId: mId,    countryCode: "AE",  stock: 12, imageUrl: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=60" },
    { name: "Dubai Chocolate Box",  description: "Pistachio knafeh chocolates",           priceCodes: 300,  categoryId: foodId, countryCode: "AE",  stock: 60, imageUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&q=60" },
    { name: "Turkish Leather Wallet",description: "Handcrafted genuine leather",          priceCodes: 280,  categoryId: mId,    countryCode: "TR",  stock: 35, imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=60" },
    { name: "Ceramic Tea Set",      description: "Hand-painted Iznik ceramics",           priceCodes: 450,  categoryId: wId,    countryCode: "TR",  stock: 18, imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=60" },
    { name: "Smart Home Speaker",   description: "Voice-controlled AI speaker",           priceCodes: 800,  categoryId: techId, countryCode: "US",  stock: 25, imageUrl: "https://images.unsplash.com/photo-1512446816042-444d641267d4?w=800&q=60" },
    { name: "Protein Powder XL",    description: "Whey isolate, chocolate flavor 5lb",   priceCodes: 650,  categoryId: foodId, countryCode: "US",  stock: 40, imageUrl: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=800&q=60" },
    { name: "Earl Grey Premium",    description: "Fortnum & Mason style tea blend",       priceCodes: 120,  categoryId: foodId, countryCode: "GB",  stock: 90, imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca3d9cde4?w=800&q=60" },
    { name: "Tweed Flat Cap",       description: "Scottish wool, one size fits all",      priceCodes: 380,  categoryId: mId,    countryCode: "GB",  stock: 22, imageUrl: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&q=60" },
    { name: "Silk Saree",           description: "Varanasi hand-woven banarasi silk",     priceCodes: 950,  categoryId: wId,    countryCode: "IN",  stock: 10, imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=60" },
    { name: "Masala Spice Box",     description: "10 authentic Indian spices",            priceCodes: 180,  categoryId: foodId, countryCode: "IN",  stock: 75, imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=60" },
    { name: "Argan Oil Set",        description: "100% pure Moroccan argan oil",          priceCodes: 350,  categoryId: cosId,  countryCode: "MA",  stock: 30, imageUrl: "https://images.unsplash.com/photo-1596924519407-c6978cc4e067?w=800&q=60" },
    { name: "Berber Rug",           description: "Handwoven authentic Berber carpet",     priceCodes: 1800, categoryId: wId,    countryCode: "MA",  stock: 8,  imageUrl: "https://images.unsplash.com/photo-1575414003006-97ee2f4b946d?w=800&q=60" },
  ];

  await Promise.all(prods.map(p => storage.createProduct(p as any)));
  console.log("[Pebalaash] Seeded OK.");
}

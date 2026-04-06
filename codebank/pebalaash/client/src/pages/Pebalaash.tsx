import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Coins, Package, ShoppingCart, Search, Menu,
  Star, Zap, Clock, Flame, History, BadgeCheck, RefreshCw, Globe, Gift,
} from "lucide-react";
import { AdminDashboard } from "@/components/AdminDashboard";
import { IceOverlay } from "@/components/iceOverlay";
import { CountrySelector } from "@/components/CountrySelector";
import { api, COUNTRIES } from "@shared/routes";
import { CartPanel } from "@/components/CartPanel";
import { MarqueeSection } from "@/components/MarqueeSection";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const purchaseSchema = z.object({
  name:    z.string().min(2, "Name is required"),
  phone:   z.string().min(5, "Valid phone required"),
  address: z.string().min(5, "Address required"),
  email:   z.string().email("Valid email required").optional().or(z.literal("")),
  notes:   z.string().optional(),
});
type PurchaseFormData = z.infer<typeof purchaseSchema>;
type PaymentType = "codes" | "silver" | "gold";

interface Category  { id: number; name: string; slug: string; }
interface Product {
  id: number; name: string; description?: string;
  priceCodes: number; priceSilver: number; priceGold: number;
  imageUrl: string; categoryId: number; stock: number; soldCount: number;
  avgRating: number | null; ratingCount: number; countryCode: string;
}
interface Wallet { userId: string; codes: number; silver: number; gold: number; balloonPoints?: number; }
interface Order  {
  id: string; productId: number; productName: string;
  paymentType: PaymentType; amountPaid: number; priceCodes: number;
  status: string; createdAt: string;
}
interface WalletItem {
  id: string; orderId: string; productId: number; productName: string;
  imageUrl: string | null; status: string; fromGift: boolean;
  gifterUsername: string | null; giftNote: string | null; acquiredAt: string;
}
interface UserSearchResult { id: string; username: string; avatarUrl: string | null; }

interface CartItem      { product: Product; addedAt: Date; }
interface PurchasedItem { id: number; productName: string; priceCodes: number; customerName: string; purchasedAt: Date; }
interface FailedPurchase { productName: string; requiredCodes: number; availableCodes: number; attemptedAt: Date; }

const PAYMENT_LABELS: Record<PaymentType, string> = { codes: "DR.D Codes", silver: "Silver Bars", gold: "Gold Bars" };
const PAYMENT_EMOJI:  Record<PaymentType, string> = { codes: "\ud83d\udd35", silver: "\ud83e\udd48", gold: "\ud83e\udd47" };
const CODES_PER_SILVER = 100;
const CODES_PER_GOLD   = 10000;
const COUNTRY_KEY = "pb_country_v1";

function getProductPrice(p: Product | null, type: PaymentType) {
  if (!p) return 0;
  if (type === "silver") return p.priceSilver;
  if (type === "gold")   return p.priceGold;
  return p.priceCodes;
}
function getWalletBalance(w: Wallet | undefined, type: PaymentType) {
  if (!w) return 0;
  if (type === "silver") return w.silver;
  if (type === "gold")   return w.gold;
  return w.codes;
}
function StarRow({ rating, count, size = 14 }: { rating: number | null; count: number; size?: number }) {
  if (!rating && !count) return null;
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} style={{ width: size, height: size }}
          className={i <= Math.round(r) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"} />
      ))}
      <span className="text-[10px] text-muted-foreground ml-0.5">
        {r > 0 ? r.toFixed(1) : ""} {count > 0 ? `(${count})` : ""}
      </span>
    </div>
  );
}

declare global { interface Window { __BALLOON_POINTS__: number; } }

export default function Pebalaash() {
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [selectedProduct,    setSelectedProduct]    = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isSheetOpen,        setIsSheetOpen]        = useState(false);
  const [isOrdersOpen,       setIsOrdersOpen]       = useState(false);
  const [isCartOpen,         setIsCartOpen]         = useState(false);
  const [isAdminOpen,        setIsAdminOpen]        = useState(false);
  const [titleClicks,        setTitleClicks]        = useState(0);
  const [isProcessing,       setIsProcessing]       = useState(false);
  const [balloonPoints,      setBalloonPoints]      = useState(0);
  const [searchQuery,        setSearchQuery]        = useState("");
  const [paymentType,        setPaymentType]        = useState<PaymentType>("codes");

  const [selectedCountry,   setSelectedCountry]   = useState<string | null>(() => localStorage.getItem(COUNTRY_KEY));
  const [showCountryPicker, setShowCountryPicker] = useState(() => !localStorage.getItem(COUNTRY_KEY));

  const [ratingProduct, setRatingProduct] = useState<Product | null>(null);
  const [ratingValue,   setRatingValue]   = useState(0);
  const [ratingReview,  setRatingReview]  = useState("");

  const [giftItem,          setGiftItem]          = useState<WalletItem | null>(null);
  const [giftRecipientQ,    setGiftRecipientQ]    = useState("");
  const [giftRecipient,     setGiftRecipient]     = useState<UserSearchResult | null>(null);
  const [giftNote,          setGiftNote]          = useState("");
  const [giftSearchResults, setGiftSearchResults] = useState<UserSearchResult[]>([]);
  const [giftSearching,     setGiftSearching]     = useState(false);
  const [giftSending,       setGiftSending]       = useState(false);

  const [cartItems,       setCartItems]       = useState<CartItem[]>([]);
  const [purchasedItems,  setPurchasedItems]  = useState<PurchasedItem[]>([]);
  const [failedPurchases, setFailedPurchases] = useState<FailedPurchase[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialise from server on mount
      fetch("/api/pebalaash/balloon/points")
        .then(r => r.ok ? r.json() : { balloonPoints: 0 })
        .then(({ balloonPoints: pts }) => setBalloonPoints(Number(pts ?? 0)))
        .catch(() => {});
      // Listen for instant updates from balloon game
      const handler = (e: any) => {
        const d = e.detail || {};
        if (d.newTotal !== undefined) setBalloonPoints(Number(d.newTotal));
        else if (d.points !== undefined) setBalloonPoints((prev: number) => prev + Number(d.points));
      };
      window.addEventListener("balloon:points:update", handler);
      return () => window.removeEventListener("balloon:points:update", handler);
    }
  }, []);

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    localStorage.setItem(COUNTRY_KEY, code);
    setShowCountryPicker(false);
    queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
  };

  const { data: categories = [] } = useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async (): Promise<Category[]> => {
      const res = await fetch(api.categories.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: [api.products.list.path, selectedCategoryId, selectedCountry],
    queryFn: async (): Promise<Product[]> => {
      const params = new URLSearchParams();
      if (selectedCategoryId) params.set("categoryId", String(selectedCategoryId));
      if (selectedCountry && selectedCountry !== "ALL") params.set("countryCode", selectedCountry);
      const url = `${api.products.list.path}${params.toString() ? "?" + params : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: [api.wallet.get.path],
    queryFn: async (): Promise<Wallet> => {
      const res = await fetch(api.wallet.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const { data: walletItems = [], isLoading: walletLoading, refetch: refetchWalletItems } = useQuery({
    queryKey: ["/api/pebalaash/wallet-items"],
    queryFn: async (): Promise<WalletItem[]> => {
      const res = await fetch("/api/pebalaash/wallet-items", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet items");
      return res.json();
    },
  });

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["/api/pebalaash/orders"],
    queryFn: async (): Promise<{ orders: Order[]; total: number }> => {
      const res = await fetch("/api/pebalaash/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: isOrdersOpen,
  });

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { name: "", phone: "", address: "", email: "", notes: "" },
  });

  const requiredAmount = getProductPrice(selectedProduct, paymentType);
  const currentBalance = getWalletBalance(wallet, paymentType);
  const canAfford      = currentBalance >= requiredAmount;

  const handleTitleClick = () => {
    const next = titleClicks + 1;
    setTitleClicks(next);
    if (next === 7) { setIsAdminOpen(true); setTitleClicks(0); }
    setTimeout(() => setTitleClicks(0), 2000);
  };

  // Gift search
  const handleGiftSearch = async (q: string) => {
    setGiftRecipientQ(q);
    setGiftRecipient(null);
    if (q.length < 2) { setGiftSearchResults([]); return; }
    setGiftSearching(true);
    try {
      const res = await fetch(`/api/pebalaash/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) setGiftSearchResults(await res.json());
    } catch (_) {}
    finally { setGiftSearching(false); }
  };

  const handleSendGift = async () => {
    if (!giftItem || !giftRecipient) return;
    setGiftSending(true);
    try {
      const res = await fetch(`/api/pebalaash/wallet-items/${giftItem.id}/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: giftRecipient.id, giftNote: giftNote || undefined }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Gift failed");
      }
      const result = await res.json();
      refetchWalletItems();
      setGiftItem(null); setGiftRecipientQ(""); setGiftRecipient(null); setGiftNote(""); setGiftSearchResults([]);
      toast({ title: "🎁 Gift Sent!", description: `${result.productName} was sent to ${giftRecipient.username}!` });
    } catch (e) {
      toast({ title: "Gift Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally { setGiftSending(false); }
  };

  const handleAddToCart = (product: Product) => {
    setCartItems(prev => [...prev, { product, addedAt: new Date() }]);
    toast({ title: "Added to cart", description: `${product.name} added.` });
  };
  const handleRemoveFromCart = (productId: number) =>
    setCartItems(prev => prev.filter(i => i.product.id !== productId));

  const handleBuyClick = (product: Product) => {
    setSelectedProduct(product); setPaymentType("codes"); setIsSheetOpen(true); form.reset();
  };

  const onPurchaseSubmit = async (data: PurchaseFormData) => {
    if (!selectedProduct || !wallet) return;
    setIsProcessing(true);
    try {
      if (!canAfford) {
        setFailedPurchases(prev => [...prev, { productName: selectedProduct.name, requiredCodes: selectedProduct.priceCodes, availableCodes: wallet.codes, attemptedAt: new Date() }]);
        throw new Error(`Insufficient ${PAYMENT_LABELS[paymentType]}`);
      }
      const res = await fetch(api.checkout.purchase.path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id, customerInfo: data, paymentType }),
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setFailedPurchases(prev => [...prev, { productName: selectedProduct.name, requiredCodes: selectedProduct.priceCodes, availableCodes: wallet.codes, attemptedAt: new Date() }]);
        throw new Error(errBody.message || "Purchase failed");
      }
      const result = await res.json();
      setPurchasedItems(prev => [...prev, { id: selectedProduct.id, productName: selectedProduct.name, priceCodes: selectedProduct.priceCodes, customerName: data.name, purchasedAt: new Date() }]);
      setCartItems(prev => prev.filter(i => i.product.id !== selectedProduct.id));
      setIsSheetOpen(false); form.reset(); refetchWallet();
      queryClient.invalidateQueries({ queryKey: ["/api/pebalaash/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pebalaash/wallet-items"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path, selectedCategoryId, selectedCountry] });
      toast({ title: "Purchase Successful!", description: `Bought ${selectedProduct.name} for ${result.amountPaid} ${PAYMENT_LABELS[paymentType]}.` });
      setTimeout(() => { setRatingProduct(selectedProduct); setRatingValue(0); setRatingReview(""); }, 1500);
    } catch (error) {
      toast({ title: "Purchase Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const submitRating = async () => {
    if (!ratingProduct || !ratingValue) return;
    try {
      await fetch(`/api/pebalaash/products/${ratingProduct.id}/ratings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingValue, review: ratingReview }), credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path, selectedCategoryId, selectedCountry] });
      toast({ title: "Thanks for your review!" });
    } catch { toast({ title: "Rating failed", variant: "destructive" }); }
    finally { setRatingProduct(null); }
  };

  const filteredProducts = products.filter((p: Product) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const equivalentSilver = Math.floor((wallet?.codes ?? 0) / CODES_PER_SILVER);
  const equivalentGold   = Math.floor((wallet?.codes ?? 0) / CODES_PER_GOLD);
  const activeCountry    = COUNTRIES.find(c => c.code === (selectedCountry || "ALL"));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarqueeSection />
      {showCountryPicker && <CountrySelector onSelect={handleCountrySelect} />}

      <nav className="bg-card/80 border-b border-border sticky top-0 z-10 backdrop-blur brand-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-3">
            <div className="flex-shrink-0 cursor-pointer select-none" onClick={handleTitleClick}>
              <h1 className="text-3xl font-display font-black tracking-tight gradient-text">
                Pebalaash<span className="text-blue-500">.</span>
              </h1>
            </div>
            <div className="hidden lg:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search products..." className="w-full pl-10 bg-background/50 border-border/50 focus:border-blue-500/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowCountryPicker(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white border border-border/40 hover:border-blue-500/40 px-3 py-1.5 h-auto rounded-xl">
                <span className="text-base">{activeCountry?.flag ?? "\ud83c\udf0d"}</span>
                <span>{activeCountry?.name ?? "All"}</span>
                <Globe className="w-3 h-3 opacity-50"/>
              </Button>
              {wallet ? (
                <>
                  <div className="hidden sm:flex items-center bg-gradient-to-r from-blue-500/20 to-blue-700/20 px-3 py-1.5 rounded-xl border border-blue-500/30 text-blue-300 gap-1.5">
                    <span className="text-xs">\ud83d\udd35</span><span className="font-bold text-sm">{wallet.codes.toLocaleString()}</span><span className="text-[10px] opacity-60 uppercase tracking-wide">Codes</span>
                  </div>
                  <div className="hidden md:flex items-center bg-gradient-to-r from-slate-400/20 to-slate-600/20 px-3 py-1.5 rounded-xl border border-slate-400/30 text-slate-300 gap-1.5">
                    <span className="text-xs">\ud83e\udd48</span><span className="font-bold text-sm">{wallet.silver.toLocaleString()}</span><span className="text-[10px] opacity-60 uppercase tracking-wide">Silver</span>
                  </div>
                  <div className="hidden md:flex items-center bg-gradient-to-r from-yellow-500/20 to-amber-600/20 px-3 py-1.5 rounded-xl border border-yellow-500/30 text-yellow-300 gap-1.5">
                    <span className="text-xs">\ud83e\udd47</span><span className="font-bold text-sm">{wallet.gold.toLocaleString()}</span><span className="text-[10px] opacity-60 uppercase tracking-wide">Gold</span>
                  </div>
                </>
              ) : (
                <div className="hidden sm:flex items-center bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground gap-1.5 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin"/>Syncing...
                </div>
              )}
              <div className="hidden lg:flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-3 py-1.5 rounded-xl border border-green-500/30 text-green-300 gap-1.5">
                <Package className="w-3.5 h-3.5 text-green-400"/><span className="font-bold text-sm">{balloonPoints.toLocaleString()}</span><span className="text-[10px] opacity-60 uppercase tracking-wide">Balloon</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setIsOrdersOpen(true)} title="My Orders" className="text-muted-foreground hover:text-foreground"><History className="w-5 h-5"/></Button>
              <Button size="icon" variant="default" onClick={() => setIsCartOpen(true)} className="relative cta-gradient cta-gradient-hover">
                <ShoppingCart className="w-5 h-5"/>
                {(cartItems.length + purchasedItems.length + failedPurchases.length) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartItems.length + purchasedItems.length + failedPurchases.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow flex flex-col">
        <div className="bg-gradient-to-b from-blue-500/5 to-transparent border-b border-border/50 py-16 px-4">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold animate-pulse">
              <Zap className="w-4 h-4"/>
              {activeCountry && activeCountry.code !== "ALL"
                ? <span>{activeCountry.flag} Shopping in {activeCountry.name}</span>
                : <span>PAY WITH CODES \xb7 SILVER \xb7 GOLD</span>}
            </div>
            <h2 className="text-6xl font-display font-black gradient-text tracking-tighter">
              The Professional Store for<br />Digital Assets.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              Use your earned codes, silver bars, or gold bars \u2014 your assets, your choice.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-12">
          <aside className="lg:w-64 flex-shrink-0 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-display font-bold text-lg text-foreground">
                <Menu className="w-5 h-5 text-blue-500"/><h3>Categories</h3>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant={selectedCategoryId === null ? "default" : "ghost"} onClick={() => setSelectedCategoryId(null)} className="justify-start font-bold">All Products</Button>
                {categories.map((cat: Category) => (
                  <Button key={cat.id} variant={selectedCategoryId === cat.id ? "default" : "ghost"} onClick={() => setSelectedCategoryId(cat.id)} className="justify-start font-bold">{cat.name}</Button>
                ))}
              </div>
            </div>

            {wallet && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Assets</p>
                  <button onClick={() => refetchWallet()} className="text-slate-500 hover:text-slate-300"><RefreshCw className="w-3.5 h-3.5"/></button>
                </div>
                {(["codes","silver","gold"] as PaymentType[]).map(type => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-slate-300 flex items-center gap-1.5">{PAYMENT_EMOJI[type]} {PAYMENT_LABELS[type]}</span>
                    <span className="font-bold text-sm text-white">{getWalletBalance(wallet, type).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {wallet && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/20 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-300 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5"/> Asset Converter</p>
                <p className="text-[11px] text-slate-400">Your {wallet.codes.toLocaleString()} codes equal:</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">\ud83e\udd48 Silver Bars</span><span className="font-bold text-slate-200">{equivalentSilver.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">\ud83e\udd47 Gold Bars</span><span className="font-bold text-yellow-300">{equivalentGold.toLocaleString()}</span></div>
                </div>
                <p className="text-[10px] text-slate-500 border-t border-slate-700 pt-2">100 codes = 1 silver \xb7 10,000 codes = 1 gold</p>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 space-y-4">
              <div className="flex items-center gap-2 font-bold text-blue-400"><Clock className="w-4 h-4"/><h4>Limited Offer</h4></div>
              <p className="text-sm text-muted-foreground font-medium">Get 20% extra CODES on your first purchase today.</p>
              <Button className="w-full cta-gradient text-xs font-black">CLAIM NOW</Button>
            </div>
          </aside>

          <div className="flex-grow">
            {isProductsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product: Product) => {
                  const affordableCodes  = wallet && wallet.codes  >= product.priceCodes;
                  const affordableSilver = wallet && wallet.silver >= product.priceSilver;
                  const affordableGold   = wallet && wallet.gold   >= product.priceGold;
                  const isAffordable     = affordableCodes || affordableSilver || affordableGold;
                  const ctryInfo = COUNTRIES.find(c => c.code === product.countryCode);
                  return (
                    <Card key={product.id} className={`group overflow-hidden glass-card transition-all duration-300 flex flex-col h-full border-border/50 hover:border-blue-500/30 ${isAffordable ? "ring-1 ring-green-500/20" : ""}`}>
                      <div className="aspect-[4/3] relative overflow-hidden bg-black/30">
                        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                          {product.soldCount > 50 && <div className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1"><Flame className="w-3 h-3"/>BESTSELLER</div>}
                          {product.avgRating && product.avgRating >= 4.5 && <div className="bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded flex items-center gap-1"><Star className="w-3 h-3 fill-current"/>{product.avgRating.toFixed(1)}</div>}
                          {!product.avgRating && <div className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1"><Star className="w-3 h-3 fill-current"/>NEW</div>}
                        </div>
                        {isAffordable && <div className="absolute top-3 left-3 bg-green-500/90 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-10 flex items-center gap-1"><BadgeCheck className="w-3 h-3"/>YOU CAN BUY</div>}
                        {ctryInfo && ctryInfo.code !== "ALL" && <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded z-10">{ctryInfo.flag} {ctryInfo.code}</div>}
                        {product.stock <= 5 && product.stock > 0 && <div className="absolute bottom-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-10">ONLY {product.stock} LEFT</div>}
                        <img src={product.imageUrl} alt={product.name} loading="lazy" className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                          onError={(e:any) => { (e.target as HTMLImageElement).src = `https://placehold.co/600x400/1e293b/94a3b8?text=${encodeURIComponent(product.name)}`; }} />
                      </div>
                      <CardContent className="p-5 flex-grow">
                        <h3 className="font-display font-bold text-lg text-foreground group-hover:text-blue-400 transition-colors mb-1">{product.name}</h3>
                        <p className="text-muted-foreground text-xs line-clamp-2 mb-2 h-8 leading-relaxed">{product.description || "Premium digital asset."}</p>
                        <div className="mb-3"><StarRow rating={product.avgRating} count={product.ratingCount}/></div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-400"><span>\ud83d\udd35 Codes</span><span className="font-bold text-blue-300">{product.priceCodes.toLocaleString()}</span></div>
                          <div className="flex items-center justify-between text-xs text-slate-400"><span>\ud83e\udd48 Silver</span><span className="font-bold text-slate-300">{product.priceSilver.toLocaleString()}</span></div>
                          <div className="flex items-center justify-between text-xs text-slate-400"><span>\ud83e\udd47 Gold</span><span className="font-bold text-yellow-300">{product.priceGold.toLocaleString()}</span></div>
                        </div>
                        <div className="mt-3"><span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{product.soldCount} Sold</span></div>
                      </CardContent>
                      <CardFooter className="p-5 pt-0 gap-2">
                        <Button className="flex-1 enterprise-button bg-background hover:bg-muted font-bold text-xs" size="sm" disabled={product.stock === 0} onClick={() => handleAddToCart(product)} variant="outline">CART</Button>
                        <Button className="flex-1 enterprise-button cta-gradient cta-gradient-hover text-white border-0 font-black text-xs" size="sm" disabled={product.stock === 0} onClick={() => handleBuyClick(product)}>BUY NOW</Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/30 rounded-3xl border-2 border-dashed border-border/50">
                <Package className="mx-auto h-16 w-16 text-muted-foreground opacity-20 mb-4"/>
                <h3 className="text-xl font-display font-bold text-foreground">No products found</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {selectedCountry && selectedCountry !== "ALL"
                    ? <span>No products for {activeCountry?.name}. <button onClick={() => setShowCountryPicker(true)} className="underline text-blue-400">Change country?</button></span>
                    : "Try adjusting your search or filters."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto bg-card border-l-2 border-blue-500/40">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-2xl gradient-text">Secure Checkout</SheetTitle>
            <SheetDescription>Choose payment method and fill in delivery info</SheetDescription>
          </SheetHeader>
          {selectedProduct && wallet && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-blue-500/30 flex gap-4 items-start">
                <div className="h-16 w-16 rounded-md bg-black/30 overflow-hidden flex-shrink-0">
                  <img src={selectedProduct.imageUrl} alt="" className="h-full w-full object-cover"/>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{selectedProduct.name}</h4>
                  <div className="flex flex-col gap-0.5 mt-1 text-xs">
                    <span className="text-blue-300">\ud83d\udd35 {selectedProduct.priceCodes.toLocaleString()} Codes</span>
                    <span className="text-slate-300">\ud83e\udd48 {selectedProduct.priceSilver.toLocaleString()} Silver</span>
                    <span className="text-yellow-300">\ud83e\udd47 {selectedProduct.priceGold.toLocaleString()} Gold</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pay With</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["codes","silver","gold"] as PaymentType[]).map(type => {
                    const bal = getWalletBalance(wallet, type); const price = getProductPrice(selectedProduct, type);
                    const canPay = bal >= price; const isSelected = paymentType === type;
                    return (
                      <button key={type} type="button" onClick={() => setPaymentType(type)}
                        className={`flex flex-col items-center p-3 rounded-xl border transition-all text-xs font-bold ${isSelected ? "border-blue-500 bg-blue-500/20 text-blue-300" : canPay ? "border-green-500/40 bg-green-500/5 text-green-300" : "border-border/50 bg-muted/30 text-muted-foreground opacity-60"}`}>
                        <span className="text-xl mb-1">{PAYMENT_EMOJI[type]}</span>
                        <span className="uppercase tracking-wide">{type}</span>
                        <span className={`mt-1 font-normal text-[10px] ${canPay ? "text-green-400" : "text-red-400"}`}>
                          {canPay ? `\u2713 ${bal.toLocaleString()} avail.` : `\u2717 Need ${price-bal}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${canAfford ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30" : "bg-gradient-to-r from-red-500/10 to-purple-500/10 border-red-500/30"}`}>
                <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-muted-foreground">Your Balance</span><span className="font-bold text-blue-300">{currentBalance.toLocaleString()} {PAYMENT_LABELS[paymentType]}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Item Price</span><span className="font-medium">\u2212{requiredAmount.toLocaleString()}</span></div>
                <div className="my-2 border-t border-border/50"/>
                {canAfford
                  ? <div className="flex justify-between font-bold text-green-400"><span>Remaining</span><span>{(currentBalance-requiredAmount).toLocaleString()} {PAYMENT_LABELS[paymentType]}</span></div>
                  : <div className="text-red-400 font-bold text-sm">\u2717 Need {(requiredAmount-currentBalance).toLocaleString()} more {PAYMENT_LABELS[paymentType]}</div>}
              </div>
              <form onSubmit={form.handleSubmit(onPurchaseSubmit)} className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><Input {...form.register("name")} placeholder="Your full name"/>{form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}</div>
                <div className="space-y-2"><Label>Phone</Label><Input {...form.register("phone")} placeholder="+20 100 000 0000"/>{form.formState.errors.phone && <p className="text-xs text-red-500">{form.formState.errors.phone.message}</p>}</div>
                <div className="space-y-2"><Label>Email (optional)</Label><Input type="email" {...form.register("email")} placeholder="you@email.com"/></div>
                <div className="space-y-2"><Label>Delivery Address</Label><Textarea {...form.register("address")} placeholder="Street, district, city, country" className="min-h-24"/>{form.formState.errors.address && <p className="text-xs text-red-500">{form.formState.errors.address.message}</p>}</div>
                <div className="space-y-2"><Label>Notes (optional)</Label><Textarea {...form.register("notes")} placeholder="Special requests\u2026" className="min-h-20"/></div>
                <Button type="submit" className="w-full cta-gradient cta-gradient-hover text-white border-0 font-bold text-base" size="lg" disabled={!canAfford || isProcessing}>
                  {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                  {canAfford ? `Confirm \u2014 Pay ${requiredAmount.toLocaleString()} ${PAYMENT_LABELS[paymentType]}` : `Insufficient ${PAYMENT_LABELS[paymentType]}`}
                </Button>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={isOrdersOpen} onOpenChange={setIsOrdersOpen}>
        <SheetContent side="right" className="w-[420px] max-w-[95vw] overflow-y-auto bg-card border-l-2 border-blue-500/40">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-2xl gradient-text flex items-center gap-2"><History className="w-6 h-6 text-blue-400"/> My Orders</SheetTitle>
            <SheetDescription>Your full purchase history</SheetDescription>
          </SheetHeader>
          {isOrdersLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
          : !ordersData?.orders?.length ? (
            <div className="text-center py-20"><Package className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-3"/><p className="text-muted-foreground">No orders yet.</p></div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{ordersData.total} order{ordersData.total !== 1 ? "s" : ""}</p>
              {ordersData.orders.map((order: Order) => (
                <div key={order.id} className="p-4 rounded-xl border border-border/60 bg-card/60 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm">{order.productName}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status==="completed"?"bg-green-500/20 text-green-400":"bg-yellow-500/20 text-yellow-400"}`}>{order.status.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{PAYMENT_EMOJI[order.paymentType as PaymentType]} {order.amountPaid?.toLocaleString()} {PAYMENT_LABELS[order.paymentType as PaymentType]}</span>
                    <span>\xb7</span>
                    <span>{new Date(order.createdAt).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"})}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {ratingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-blue-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-display text-xl font-bold gradient-text">Rate Your Purchase \u2b50</h3>
            <p className="text-sm text-muted-foreground">How was <strong className="text-foreground">{ratingProduct.name}</strong>?</p>
            <div className="flex gap-2 justify-center">
              {[1,2,3,4,5].map(i => (
                <button key={i} type="button" onClick={() => setRatingValue(i)} className="hover:scale-125 transition-transform">
                  <Star className={`w-8 h-8 ${i<=ratingValue?"fill-yellow-400 text-yellow-400":"text-muted-foreground/40"}`}/>
                </button>
              ))}
            </div>
            <Textarea value={ratingReview} onChange={e => setRatingReview(e.target.value)} placeholder="Leave a review (optional)\u2026" className="min-h-20 text-sm"/>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setRatingProduct(null)}>Skip</Button>
              <Button className="flex-1 cta-gradient text-white font-bold" disabled={!ratingValue} onClick={submitRating}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="w-[400px] max-w-[90vw] p-0 bg-card border-l-2 border-blue-500/40">
          <SheetHeader className="p-4 border-b border-border bg-black/20">
            <SheetTitle className="font-display text-2xl gradient-text">Dashboard</SheetTitle>
            <SheetDescription>Orders &amp; Activity</SheetDescription>
          </SheetHeader>
          <CartPanel
            cartItems={cartItems}
            purchasedItems={purchasedItems}
            failedPurchases={failedPurchases}
            walletItems={walletItems as WalletItem[]}
            walletLoading={walletLoading}
            onRemoveFromCart={handleRemoveFromCart}
            onGiftItem={(item) => { setGiftItem(item); setGiftRecipientQ(""); setGiftRecipient(null); setGiftNote(""); setGiftSearchResults([]); }}
            wallet={wallet}
          />
        </SheetContent>
      </Sheet>

      {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)}/>}

      {/* ── Gift Dialog ── */}
      <Dialog open={!!giftItem} onOpenChange={(open) => { if (!open) setGiftItem(null); }}>
        <DialogContent className="bg-card border border-pink-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-pink-300 flex items-center gap-2">
              <Gift className="w-5 h-5"/> Send as Gift 🎁
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Gift <strong className="text-foreground">{giftItem?.productName}</strong> to another user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Recipient search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recipient Username or Email</label>
              <div className="relative">
                <Input
                  value={giftRecipientQ}
                  onChange={e => handleGiftSearch(e.target.value)}
                  placeholder="Search by username…"
                  className="bg-background/50 border-border"
                />
                {giftSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground"/>}
              </div>
              {giftSearchResults.length > 0 && !giftRecipient && (
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  {giftSearchResults.map(u => (
                    <button key={u.id} type="button"
                      onClick={() => { setGiftRecipient(u); setGiftRecipientQ(u.username); setGiftSearchResults([]); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover"/>
                          : u.username[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
              {giftRecipient && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-500/10 border border-pink-500/30">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {giftRecipient.username[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-pink-300">{giftRecipient.username}</span>
                  <button type="button" onClick={() => { setGiftRecipient(null); setGiftRecipientQ(""); }} className="ml-auto text-muted-foreground hover:text-foreground text-xs">✕</button>
                </div>
              )}
            </div>
            {/* Gift note */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gift Note (optional)</label>
              <textarea
                value={giftNote}
                onChange={e => setGiftNote(e.target.value)}
                placeholder="Write a short message…"
                className="w-full min-h-20 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setGiftItem(null)} disabled={giftSending}>Cancel</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold border-0"
                disabled={!giftRecipient || giftSending}
                onClick={handleSendGift}
              >
                {giftSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Gift className="w-4 h-4 mr-2"/>}
                Send Gift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <IceOverlay/>
    </div>
  );
}

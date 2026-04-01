import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Coins, Package, ShoppingCart, Search, Menu, Filter, Star, Zap, Clock } from "lucide-react";
import { AdminDashboard } from "@/components/AdminDashboard";
import { IceOverlay } from "@/components/iceOverlay";
import { api } from "@shared/routes";
import { CartPanel } from "@/components/CartPanel";
import { MarqueeSection } from "@/components/MarqueeSection";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const purchaseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(5, "Valid phone required"),
  address: z.string().min(5, "Address required"),
  notes: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  priceCodes: number;
  imageUrl: string;
  categoryId: number;
  stock: number;
  soldCount: number;
}

interface Wallet {
  userId: string;
  codes: number;
}

interface CartItem {
  product: Product;
  addedAt: Date;
}

interface PurchasedItem {
  id: number;
  productName: string;
  priceCodes: number;
  customerName: string;
  purchasedAt: Date;
}

interface FailedPurchase {
  productName: string;
  requiredCodes: number;
  availableCodes: number;
  attemptedAt: Date;
}

const GUEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

// Declare global window property for TypeScript
declare global {
  interface Window {
    __BALLOON_POINTS__: number;
  }
}

export default function Pebalaash() {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [titleClicks, setTitleClicks] = useState(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [balloonPoints, setBalloonPoints] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [failedPurchases, setFailedPurchases] = useState<FailedPurchase[]>([]);

  // Listen for balloon points updates
  useEffect(() => {
    // Initialize with current global points
    if (typeof window !== 'undefined') {
      setBalloonPoints(window.__BALLOON_POINTS__ || 0);
      
      const handlePointsUpdate = (e: any) => {
        setBalloonPoints(e.detail.points);
      };

      window.addEventListener('balloon:points:update', handlePointsUpdate);
      
      return () => {
        window.removeEventListener('balloon:points:update', handlePointsUpdate);
      };
    }
  }, []);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async (): Promise<Category[]> => {
      const res = await fetch(api.categories.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  // Fetch products
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: [api.products.list.path, selectedCategoryId],
    queryFn: async (): Promise<Product[]> => {
      const url = selectedCategoryId 
        ? `${api.products.list.path}?categoryId=${selectedCategoryId}`
        : api.products.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Fetch wallet
  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: [api.wallet.get.path],
    queryFn: async (): Promise<Wallet> => {
      const res = await fetch(api.wallet.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
  });

  // Form handling
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const handleTitleClick = () => {
    const newCount = titleClicks + 1;
    setTitleClicks(newCount);
    if (newCount === 7) {
      setIsAdminOpen(true);
      setTitleClicks(0);
    }
    setTimeout(() => setTitleClicks(0), 2000);
  };

  const handleAddToCart = (product: Product) => {
    setCartItems([...cartItems, { product, addedAt: new Date() }]);
    toast({
      title: "Added to cart",
      description: `${product.name} added to cart.`,
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems(cartItems.filter((item: CartItem) => item.product.id !== productId));
  };

  const handleBuyClick = (product: Product) => {
    setSelectedProduct(product);
    setIsSheetOpen(true);
    form.reset();
  };

  const onPurchaseSubmit = async (data: PurchaseFormData) => {
    if (!selectedProduct || !wallet) return;

    setIsProcessing(true);
    try {
      // Check if they can afford it
      if (wallet.codes < selectedProduct.priceCodes) {
        setFailedPurchases([
          ...failedPurchases,
          {
            productName: selectedProduct.name,
            requiredCodes: selectedProduct.priceCodes,
            availableCodes: wallet.codes,
            attemptedAt: new Date(),
          },
        ]);
        throw new Error("Insufficient codes balance");
      }

      const res = await fetch(api.checkout.purchase.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          customerInfo: data,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        setFailedPurchases([
          ...failedPurchases,
          {
            productName: selectedProduct.name,
            requiredCodes: selectedProduct.priceCodes,
            availableCodes: wallet.codes,
            attemptedAt: new Date(),
          },
        ]);
        throw new Error(error.message || "Purchase failed");
      }

      // Add to purchased items
      setPurchasedItems([
        ...purchasedItems,
        {
          id: selectedProduct.id,
          productName: selectedProduct.name,
          priceCodes: selectedProduct.priceCodes,
          customerName: data.name,
          purchasedAt: new Date(),
        },
      ]);

      // Remove from cart if exists
      setCartItems(cartItems.filter((item: CartItem) => item.product.id !== selectedProduct.id));

      setIsSheetOpen(false);
      form.reset();
      refetchWallet();

      toast({
        title: "Purchase Successful!",
        description: `You bought ${selectedProduct.name} for ${selectedProduct.priceCodes} codes.`,
      });
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter((p: Product) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Marquee */}
      <MarqueeSection />

      {/* Navigation */}
      <nav className="bg-card/80 border-b border-border sticky top-0 z-10 backdrop-blur brand-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 cursor-pointer select-none" onClick={handleTitleClick}>
              <h1 className="text-3xl font-display font-black tracking-tight gradient-text">
                Pebalaash<span className="text-blue-500">.</span>
              </h1>
            </div>

            {/* Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="w-full pl-10 bg-background/50 border-border/50 focus:border-blue-500/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {wallet && (
                <div className="hidden md:flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 rounded-xl border border-blue-500/30 text-blue-300">
                  <Coins className="w-4 h-4 mr-2 text-blue-400" />
                  <span className="font-bold">{wallet.codes.toLocaleString()}</span>
                  <span className="text-xs ml-2 opacity-70">CODES</span>
                </div>
              )}
              {/* Balloon Points Display */}
              <div className="hidden md:flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-2 rounded-xl border border-green-500/30 text-green-300">
                <Package className="w-4 h-4 mr-2 text-green-400" />
                <span className="font-bold">{balloonPoints.toLocaleString()}</span>
                <span className="text-xs ml-2 opacity-70">BALLOON</span>
              </div>
              <Button 
                size="icon" 
                variant="default"
                onClick={() => setIsCartOpen(true)}
                className="relative cta-gradient cta-gradient-hover"
                >
                <ShoppingCart className="w-5 h-5" />
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
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-blue-500/5 to-transparent border-b border-border/50 py-16 px-4">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold animate-pulse">
              <Zap className="w-4 h-4" />
              <span>NEW SPRING COLLECTION 2024</span>
            </div>
            <h2 className="text-6xl font-display font-black gradient-text tracking-tighter">
              The Professional Store for <br /> Digital Assets.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              Join thousands of businesses sourcing premium products on Pebalaash.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-12">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-display font-bold text-lg text-foreground">
                <Menu className="w-5 h-5 text-blue-500" />
                <h3>Categories</h3>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant={selectedCategoryId === null ? "default" : "ghost"}
                  onClick={() => setSelectedCategoryId(null)}
                  className="justify-start font-bold"
                >
                  All Products
                </Button>
                {categories.map((cat: Category) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategoryId === cat.id ? "default" : "ghost"}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="justify-start font-bold"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 space-y-4">
              <div className="flex items-center gap-2 font-bold text-blue-400">
                <Clock className="w-4 h-4" />
                <h4>Limited Offer</h4>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Get 20% extra CODES on your first purchase today.
              </p>
              <Button className="w-full cta-gradient text-xs font-black">CLAIM NOW</Button>
            </div>
          </aside>

          {/* Main Grid */}
          <div className="flex-grow">
            {isProductsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product: Product) => (
                  <Card key={product.id} className="group overflow-hidden glass-card transition-all duration-300 flex flex-col h-full border-border/50 hover:border-blue-500/30">
                    <div className="aspect-[4/3] relative overflow-hidden bg-black/30">
                      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                        {product.soldCount > 50 && (
                          <div className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                            <Flame className="w-3 h-3" /> BESTSELLER
                          </div>
                        )}
                        <div className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                          <Star className="w-3 h-3 fill-current" /> 4.9
                        </div>
                      </div>
                      
                      {product.stock <= 5 && product.stock > 0 && (
                        <div className="absolute bottom-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-10">
                          ONLY {product.stock} LEFT
                        </div>
                      )}
                      
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        loading="lazy"
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                        onError={(e: any) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/600x400/1e293b/94a3b8?text=${encodeURIComponent(product.name)}`;
                        }}
                      />
                    </div>

                    <CardContent className="p-5 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-display font-bold text-lg text-foreground group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-xs line-clamp-2 mb-4 h-8 leading-relaxed">
                        {product.description || "Premium high-end digital asset curated for professionals."}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center text-blue-300 font-black text-lg">
                          <Coins className="w-5 h-5 mr-1.5 text-blue-500" />
                          {product.priceCodes.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {product.soldCount} Sold
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-5 pt-0 gap-2">
                      <Button 
                        className="flex-1 enterprise-button bg-background hover:bg-muted font-bold text-xs" 
                        size="sm"
                        disabled={product.stock === 0}
                        onClick={() => handleAddToCart(product)}
                        variant="outline"
                      >
                        CART
                      </Button>
                      <Button 
                        className="flex-1 enterprise-button cta-gradient cta-gradient-hover text-white border-0 font-black text-xs" 
                        size="sm"
                        disabled={product.stock === 0}
                        onClick={() => handleBuyClick(product)}
                      >
                        BUY NOW
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/30 rounded-3xl border-2 border-dashed border-border/50">
                <Package className="mx-auto h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-xl font-display font-bold text-foreground">No matches found</h3>
                <p className="text-muted-foreground mt-2">Try adjusting your search or category filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto bg-card border-l-2 border-blue-500/40">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-2xl gradient-text">Secure Checkout</SheetTitle>
            <SheetDescription className="text-muted-foreground">Provide delivery information</SheetDescription>
          </SheetHeader>

          {selectedProduct && wallet && (
            <div className="space-y-8">
              {/* Product Summary */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-blue-500/30 flex gap-4 items-start">
                <div className="h-16 w-16 rounded-md bg-black/30 border border-orange-500/30 overflow-hidden flex-shrink-0">
                  <img src={selectedProduct.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{selectedProduct.name}</h4>
                  <div className="flex items-center text-blue-400 font-bold mt-1">
                    <Coins className="w-4 h-4 mr-1" />
                    {selectedProduct.priceCodes.toLocaleString()} Codes
                  </div>
                </div>
              </div>

              {/* Wallet Status */}
              <div className={`p-4 rounded-xl border ${canAfford ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' : 'bg-gradient-to-r from-red-500/10 to-purple-500/10 border-red-500/30'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-muted-foreground">Your Balance</span>
                  <span className="font-bold text-blue-300">{wallet.codes.toLocaleString()} Codes</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Item Price</span>
                  <span className="font-medium text-foreground">-{selectedProduct.priceCodes.toLocaleString()}</span>
                </div>
                <div className="my-2 border-t border-border/50"></div>
                {canAfford ? (
                  <div className="flex justify-between items-center font-bold text-green-400">
                    <span>Remaining</span>
                    <span>{(wallet.codes - selectedProduct.priceCodes).toLocaleString()} Codes</span>
                  </div>
                ) : (
                  <div className="text-red-400 font-bold text-sm">Insufficient balance</div>
                )}
              </div>

              {/* Form */}
              <form onSubmit={form.handleSubmit(onPurchaseSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...form.register("name")} placeholder="John Doe" />
                  {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" {...form.register("phone")} placeholder="+1 234 567 8900" />
                  {form.formState.errors.phone && <p className="text-xs text-red-500">{form.formState.errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address</Label>
                  <Textarea id="address" {...form.register("address")} placeholder="123 Main St, City, Country" className="min-h-24" />
                  {form.formState.errors.address && <p className="text-xs text-red-500">{form.formState.errors.address.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" {...form.register("notes")} placeholder="Any special requests..." className="min-h-20" />
                </div>

                <Button 
                  type="submit" 
                  className="w-full enterprise-button cta-gradient cta-gradient-hover text-white border-0 font-bold text-base" 
                  size="lg"
                  disabled={!canAfford || isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {canAfford ? "Confirm Purchase" : "Insufficient Codes"}
                </Button>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Cart Side Panel */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="w-[400px] max-w-[90vw] p-0 bg-card border-l-2 border-blue-500/40">
          <SheetHeader className="p-4 border-b border-border bg-black/20">
            <SheetTitle className="font-display text-2xl gradient-text">Dashboard</SheetTitle>
            <SheetDescription className="text-muted-foreground">Orders & Activity</SheetDescription>
          </SheetHeader>
          <CartPanel
            cartItems={cartItems}
            purchasedItems={purchasedItems}
            failedPurchases={failedPurchases}
            onRemoveFromCart={handleRemoveFromCart}
            wallet={wallet}
          />
        </SheetContent>
      </Sheet>

      {/* Admin Dashboard */}
      {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}
      
      {/* Ice Overlay Animation */}
      <IceOverlay />
    </div>
  );
}

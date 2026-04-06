import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Trash2, ShoppingCart, CheckCircle, XCircle, Clock, Gift, Package, Loader2 } from "lucide-react";

interface CartItem      { product: any; addedAt: Date; }
interface PurchasedItem { id: number; productName: string; priceCodes: number; customerName: string; purchasedAt: Date; }
interface FailedPurchase { productName: string; requiredCodes: number; availableCodes: number; attemptedAt: Date; }
interface WalletItem {
  id: string; orderId: string; productId: number; productName: string;
  imageUrl: string | null; status: string; fromGift: boolean;
  gifterUsername: string | null; giftNote: string | null; acquiredAt: string;
}

interface CartPanelProps {
  cartItems:       CartItem[];
  purchasedItems:  PurchasedItem[];
  failedPurchases: FailedPurchase[];
  walletItems:     WalletItem[];
  walletLoading:   boolean;
  onRemoveFromCart:  (productId: number) => void;
  onGiftItem:        (item: WalletItem) => void;
  wallet:            { codes: number } | undefined;
}

export function CartPanel({
  cartItems, purchasedItems, failedPurchases, walletItems, walletLoading,
  onRemoveFromCart, onGiftItem, wallet,
}: CartPanelProps) {
  const cartTotal      = cartItems.reduce((s, i) => s + i.product.priceCodes, 0);
  const canCheckoutAll = wallet && wallet.codes >= cartTotal;
  const pendingCount   = walletItems.filter(w => w.status === 'pending').length;

  return (
    <div className="h-full overflow-y-auto">
      <Tabs defaultValue="wallet" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sticky top-0 bg-black/40 backdrop-blur border-b border-border text-xs">
          <TabsTrigger value="wallet" className="text-xs">
            <Package className="w-3.5 h-3.5 mr-1"/>
            <span className="hidden sm:inline">Wallet</span>
            {pendingCount > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="cart" className="text-xs">
            <ShoppingCart className="w-3.5 h-3.5 mr-1"/>
            <span className="hidden sm:inline">Cart</span>
            {cartItems.length > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{cartItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <Clock className="w-3.5 h-3.5 mr-1"/>
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-xs">
            <XCircle className="w-3.5 h-3.5 mr-1"/>
            <span className="hidden sm:inline">Failed</span>
            {failedPurchases.length > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{failedPurchases.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── WALLET TAB ── */}
        <TabsContent value="wallet" className="space-y-3 p-4">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">🛍️ Pending Shipping</p>
          {walletLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>
          ) : walletItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50"/>
              <p className="text-sm">Your wallet is empty</p>
              <p className="text-xs opacity-60 mt-1">Purchased items appear here while awaiting shipment</p>
            </div>
          ) : (
            walletItems.map(item => (
              <Card key={item.id} className={`border-l-4 ${item.fromGift ? 'border-l-pink-500 bg-pink-500/10 border-pink-500/30' : 'border-l-blue-500 bg-blue-500/10 border-blue-500/30'}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-black/30"
                        onError={(e: any) => { e.target.style.display = 'none'; }}/>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm line-clamp-2 text-foreground">{item.productName}</h4>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${item.fromGift ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                            {item.fromGift ? '🎁 Gift' : '🛒 Purchased'}
                          </Badge>
                        </div>
                      </div>
                      {item.fromGift && item.gifterUsername && (
                        <p className="text-xs text-pink-300 mt-0.5">From: {item.gifterUsername}</p>
                      )}
                      {item.giftNote && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">"{item.giftNote}"</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(item.acquiredAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/20">
                          ⏳ Awaiting Shipment
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2 border-pink-500/40 text-pink-300 hover:bg-pink-500/20 hover:border-pink-500 font-bold"
                          onClick={() => onGiftItem(item)}
                        >
                          <Gift className="w-3 h-3 mr-1"/> Gift
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── CART TAB ── */}
        <TabsContent value="cart" className="space-y-4 p-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50"/>
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <Card key={idx} className="border-l-4 border-l-orange-500 bg-black/30 border-orange-500/20">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm line-clamp-1 text-foreground">{item.product.name}</h4>
                          <div className="flex items-center text-orange-400 font-bold mt-1">
                            <Coins className="w-3 h-3 mr-1"/><span className="text-sm">{item.product.priceCodes}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onRemoveFromCart(item.product.id)}>
                          <Trash2 className="w-4 h-4 text-destructive"/>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 p-3 rounded-lg border border-orange-500/30 sticky bottom-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-foreground">Subtotal</span>
                  <div className="flex items-center text-orange-400 font-bold"><Coins className="w-4 h-4 mr-1"/>{cartTotal}</div>
                </div>
                {wallet && (
                  <>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                      <span>Balance</span><span className="text-orange-300">{wallet.codes}</span>
                    </div>
                    <div className={`flex justify-between items-center font-bold text-sm ${canCheckoutAll ? 'text-green-400' : 'text-red-400'}`}>
                      <span>{canCheckoutAll ? 'Remaining' : 'Short by'}</span>
                      <span>{canCheckoutAll ? wallet.codes - cartTotal : cartTotal - wallet.codes}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history" className="space-y-3 p-4">
          {purchasedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50"/><p className="text-sm">No purchase history</p>
            </div>
          ) : (
            purchasedItems.map((item, idx) => (
              <Card key={idx} className="border-l-2 border-l-blue-400 bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 text-xs">
                      <h4 className="font-medium line-clamp-1 text-foreground">{item.productName}</h4>
                      <p className="text-muted-foreground line-clamp-1">{item.customerName}</p>
                      <p className="text-muted-foreground mt-1">{new Date(item.purchasedAt).toLocaleDateString()} {new Date(item.purchasedAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-orange-400 font-bold text-sm whitespace-nowrap">-{item.priceCodes}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── FAILED TAB ── */}
        <TabsContent value="failed" className="space-y-3 p-4">
          {failedPurchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-green-600"/><p className="text-sm">No failed purchases</p>
            </div>
          ) : (
            failedPurchases.map((failed, idx) => (
              <Card key={idx} className="border-l-4 border-l-red-500 bg-red-500/10 border-red-500/30">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm line-clamp-1 text-foreground">{failed.productName}</h4>
                      <Badge variant="destructive" className="whitespace-nowrap bg-red-500/20 text-red-300 border-red-500/30">Failed</Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Required:</span><span className="font-bold text-red-400">{failed.requiredCodes}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Available:</span><span className="font-bold text-orange-400">{failed.availableCodes}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Short by:</span><span className="font-bold text-red-400">{failed.requiredCodes - failed.availableCodes}</span></div>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(failed.attemptedAt).toLocaleDateString()} {new Date(failed.attemptedAt).toLocaleTimeString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

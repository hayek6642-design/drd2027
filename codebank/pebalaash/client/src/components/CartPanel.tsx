import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Trash2, ShoppingCart, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CartItem {
  product: any;
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

interface CartPanelProps {
  cartItems: CartItem[];
  purchasedItems: PurchasedItem[];
  failedPurchases: FailedPurchase[];
  onRemoveFromCart: (productId: number) => void;
  wallet: { codes: number } | undefined;
}

export function CartPanel({
  cartItems,
  purchasedItems,
  failedPurchases,
  onRemoveFromCart,
  wallet,
}: CartPanelProps) {
  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.priceCodes, 0);
  const canCheckoutAll = wallet && wallet.codes >= cartTotal;

  return (
    <div className="h-full overflow-y-auto">
      <Tabs defaultValue="cart" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sticky top-0 bg-black/40 backdrop-blur border-b border-border">
          <TabsTrigger value="cart" className="text-xs sm:text-sm">
            <ShoppingCart className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Cart</span>
            {cartItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {cartItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="purchased" className="text-xs sm:text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Bought</span>
            {purchasedItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {purchasedItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <Clock className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-xs sm:text-sm">
            <XCircle className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Failed</span>
            {failedPurchases.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {failedPurchases.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* CART TAB */}
        <TabsContent value="cart" className="space-y-4 p-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
                            <Coins className="w-3 h-3 mr-1" />
                            <span className="text-sm">{item.product.priceCodes}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => onRemoveFromCart(item.product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 p-3 rounded-lg border border-orange-500/30 sticky bottom-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-foreground">Subtotal</span>
                  <div className="flex items-center text-orange-400 font-bold">
                    <Coins className="w-4 h-4 mr-1" />
                    {cartTotal}
                  </div>
                </div>
                {wallet && (
                  <>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                      <span>Balance</span>
                      <span className="text-orange-300">{wallet.codes}</span>
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

        {/* PURCHASED TAB */}
        <TabsContent value="purchased" className="space-y-3 p-4">
          {purchasedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No purchases yet</p>
            </div>
          ) : (
            purchasedItems.map((item, idx) => (
              <Card key={idx} className="border-l-4 border-l-green-500 bg-green-500/10 border-green-500/30">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm line-clamp-1 text-foreground">{item.productName}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.customerName}</p>
                      <div className="flex items-center text-green-400 font-bold mt-1">
                        <Coins className="w-3 h-3 mr-1" />
                        <span className="text-sm">{item.priceCodes}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30 whitespace-nowrap">
                      Purchased
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-3 p-4">
          {purchasedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No purchase history</p>
            </div>
          ) : (
            <div className="space-y-2">
              {purchasedItems.map((item, idx) => (
                <Card key={idx} className="border-l-2 border-l-blue-400 bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 text-xs">
                        <h4 className="font-medium line-clamp-1 text-foreground">{item.productName}</h4>
                        <p className="text-muted-foreground line-clamp-1">{item.customerName}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {new Date(item.purchasedAt).toLocaleDateString()} {new Date(item.purchasedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-orange-400 font-bold text-sm whitespace-nowrap">
                        -{item.priceCodes}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* FAILED PURCHASES TAB */}
        <TabsContent value="failed" className="space-y-3 p-4">
          {failedPurchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-green-600" />
              <p className="text-sm">No failed purchases</p>
            </div>
          ) : (
            failedPurchases.map((failed, idx) => (
              <Card key={idx} className="border-l-4 border-l-red-500 bg-red-500/10 border-red-500/30">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm line-clamp-1 text-foreground">{failed.productName}</h4>
                      <Badge variant="destructive" className="whitespace-nowrap bg-red-500/20 text-red-300 border-red-500/30">
                        Failed
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Required:</span>
                        <span className="font-bold text-red-400">{failed.requiredCodes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available:</span>
                        <span className="font-bold text-orange-400">{failed.availableCodes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Short by:</span>
                        <span className="font-bold text-red-400">{failed.requiredCodes - failed.availableCodes}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(failed.attemptedAt).toLocaleDateString()} {new Date(failed.attemptedAt).toLocaleTimeString()}
                    </p>
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

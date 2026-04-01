import { useState } from "react";
import { api } from "@shared/routes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminDashboardProps {
  onClose: () => void;
}

interface AdminStats {
  totalSold: number;
  totalRevenueCodes: number;
  recentOrders: Array<{
    id: string;
    customerInfo?: {
      name: string;
      phone: string;
    };
    productName?: string;
    productId?: number;
    totalCodes: number;
  }>;
  lowStockProducts: Array<{
    id: number;
    name: string;
    stock: number;
  }>;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (password === "doitasap2025") {
      setIsLoading(true);
      try {
        const res = await fetch(api.admin.stats.path, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
        setIsAuthenticated(true);
        setError("");
      } catch (err) {
        setError("Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("Incorrect password");
    }
  };

  const handleClose = () => {
    setIsAuthenticated(false);
    setPassword("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={true} onOpenChange={(open: boolean) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-center mb-6">
            {isAuthenticated ? "Admin Dashboard" : "Restricted Access"}
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto w-full py-8">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="text-center text-lg"
              />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Access Dashboard
            </Button>
          </form>
        ) : stats ? (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="shadow-md border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" /> Total Items Sold
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalSold}</div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Revenue (Codes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">{stats.totalRevenueCodes.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Low Stock Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.lowStockProducts.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" /> Recent Sales
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Product</th>
                      <th className="px-6 py-3 text-right">Total Codes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      stats.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="font-medium text-gray-900">{order.customerInfo?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{order.customerInfo?.phone}</div>
                          </td>
                          <td className="px-6 py-3 text-gray-700">{order.productName || `Product #${order.productId}`}</td>
                          <td className="px-6 py-3 text-right font-bold text-amber-600">
                            {order.totalCodes.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Warning */}
            {stats.lowStockProducts.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Low Stock Alert
                </h3>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {stats.lowStockProducts.map((p) => (
                    <li key={p.id}>{p.name} - Only {p.stock} remaining</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  X, Plus, Pencil, Trash2, BarChart2, Package,
  TrendingUp, AlertTriangle, Loader2, Globe, ShieldCheck,
} from "lucide-react";
import { COUNTRIES } from "@shared/routes";

interface Product {
  id: number; name: string; description?: string;
  priceCodes: number; priceSilver: number; priceGold: number;
  imageUrl: string; categoryId: number; countryCode: string;
  stock: number; soldCount: number; avgRating: number | null; ratingCount: number;
}
interface Category { id: number; name: string; slug: string; }

const EMPTY_FORM = {
  name: "", description: "", priceCodes: "", priceSilver: "", priceGold: "",
  imageUrl: "", categoryId: "", countryCode: "ALL", stock: "0",
};

function useAdminHeader(pw: string) {
  return { headers: { "x-admin-password": pw, "Content-Type": "application/json" } };
}

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  // ── Auth phase ────────────────────────────────────────────────
  const [authed,    setAuthed]    = useState(false);
  const [pwInput,   setPwInput]   = useState("");
  const [authError, setAuthError] = useState("");

  const attemptAuth = async () => {
    const res = await fetch("/api/pebalaash/admin/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwInput }),
    });
    if (res.ok) { setAuthed(true); setAuthError(""); }
    else setAuthError("Wrong password. Try again.");
  };

  // ── Tab state ─────────────────────────────────────────────────
  const [tab, setTab] = useState<"products" | "stats">("products");
  const [editing,    setEditing]    = useState<Product | null>(null);
  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [showForm,   setShowForm]   = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const adminHeaders = useAdminHeader(pwInput);

  // ── Queries ───────────────────────────────────────────────────
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/pebalaash/admin/products"],
    enabled: authed,
    queryFn: async () => {
      const r = await fetch("/api/pebalaash/admin/products", adminHeaders);
      return r.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/pebalaash/categories"],
    enabled: authed,
    queryFn: async () => {
      const r = await fetch("/api/pebalaash/categories");
      return r.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/pebalaash/admin/stats"],
    enabled: authed && tab === "stats",
    queryFn: async () => {
      const r = await fetch("/api/pebalaash/admin/stats", adminHeaders);
      return r.json();
    },
  });

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/pebalaash/admin/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/pebalaash/products"] });
  };

  const buildPayload = () => ({
    name:        formData.name,
    description: formData.description,
    priceCodes:  Number(formData.priceCodes),
    priceSilver: Number(formData.priceSilver) || Math.ceil(Number(formData.priceCodes) / 100),
    priceGold:   Number(formData.priceGold)   || Math.ceil(Number(formData.priceCodes) / 10000) || 1,
    imageUrl:    formData.imageUrl,
    categoryId:  Number(formData.categoryId),
    countryCode: formData.countryCode,
    stock:       Number(formData.stock),
  });

  const saveProduct = async () => {
    if (!formData.name || !formData.priceCodes || !formData.categoryId || !formData.imageUrl) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    const payload = buildPayload();
    if (editing) {
      await fetch(`/api/pebalaash/admin/products/${editing.id}`, { method: "PUT", body: JSON.stringify(payload), ...adminHeaders });
      toast({ title: "Product updated!" });
    } else {
      await fetch("/api/pebalaash/admin/products", { method: "POST", body: JSON.stringify(payload), ...adminHeaders });
      toast({ title: "Product created!" });
    }
    invalidate(); setShowForm(false); setEditing(null); setFormData(EMPTY_FORM);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/pebalaash/admin/products/${deleteId}`, { method: "DELETE", ...adminHeaders });
    toast({ title: "Product deleted" }); invalidate(); setDeleteId(null);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setFormData({
      name:        p.name,
      description: p.description || "",
      priceCodes:  String(p.priceCodes),
      priceSilver: String(p.priceSilver),
      priceGold:   String(p.priceGold),
      imageUrl:    p.imageUrl,
      categoryId:  String(p.categoryId),
      countryCode: p.countryCode,
      stock:       String(p.stock),
    });
    setShowForm(true);
  };

  const setField = (k: keyof typeof EMPTY_FORM, v: string) => setFormData(d => ({ ...d, [k]: v }));

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-blue-500/30 rounded-3xl shadow-2xl w-full max-w-5xl mt-4 mb-4 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-400"/>
            <h2 className="text-xl font-display font-black gradient-text">Pebalaash Admin</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {/* Auth gate */}
        {!authed ? (
          <div className="flex flex-col items-center justify-center p-12 gap-5">
            <div className="bg-blue-500/10 p-4 rounded-full"><ShieldCheck className="w-10 h-10 text-blue-400"/></div>
            <h3 className="text-lg font-bold text-foreground">Enter Admin Password</h3>
            <Input type="password" placeholder="Admin password…" value={pwInput} onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attemptAuth()}
              className="w-full max-w-sm text-center text-lg tracking-widest border-blue-500/40" />
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <Button className="cta-gradient text-white font-bold w-full max-w-sm" onClick={attemptAuth}>Unlock Dashboard</Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 p-4 border-b border-border/40 bg-black/20">
              {([["products","Products",Package],["stats","Stats",BarChart2]] as any[]).map(([id,label,Icon]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab===id?"bg-blue-500/20 text-blue-300 border border-blue-500/40":"text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-4 h-4"/>{label}
                </button>
              ))}
            </div>

            {/* Products tab */}
            {tab === "products" && (
              <div className="p-4 flex flex-col gap-4 flex-grow overflow-y-auto max-h-[75vh]">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground font-bold">{products.length} products</p>
                  <Button size="sm" className="cta-gradient text-white font-bold" onClick={() => { setEditing(null); setFormData(EMPTY_FORM); setShowForm(true); }}>
                    <Plus className="w-4 h-4 mr-1"/>Add Product
                  </Button>
                </div>

                {/* Inline form */}
                {showForm && (
                  <div className="border border-blue-500/30 rounded-2xl bg-blue-500/5 p-5 space-y-4">
                    <h4 className="font-bold text-blue-300 flex items-center gap-2">
                      {editing ? <><Pencil className="w-4 h-4"/>Edit Product</> : <><Plus className="w-4 h-4"/>New Product</>}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Name *</Label>
                        <Input value={formData.name} onChange={e => setField("name", e.target.value)} placeholder="Product name"/>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                        <Textarea value={formData.description} onChange={e => setField("description", e.target.value)} placeholder="Short description…" className="min-h-16"/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Price (Codes) *</Label>
                        <Input type="number" min={1} value={formData.priceCodes} onChange={e => setField("priceCodes", e.target.value)}/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Price (Silver) <span className="text-[10px] normal-case opacity-60">auto if blank</span></Label>
                        <Input type="number" min={0} value={formData.priceSilver} onChange={e => setField("priceSilver", e.target.value)} placeholder="auto"/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Price (Gold) <span className="text-[10px] normal-case opacity-60">auto if blank</span></Label>
                        <Input type="number" min={0} value={formData.priceGold} onChange={e => setField("priceGold", e.target.value)} placeholder="auto"/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Stock *</Label>
                        <Input type="number" min={0} value={formData.stock} onChange={e => setField("stock", e.target.value)}/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Category *</Label>
                        <select value={formData.categoryId} onChange={e => setField("categoryId", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                          <option value="">Select category…</option>
                          {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Country</Label>
                        <select value={formData.countryCode} onChange={e => setField("countryCode", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Image URL *</Label>
                        <Input value={formData.imageUrl} onChange={e => setField("imageUrl", e.target.value)} placeholder="https://…"/>
                        {formData.imageUrl && <img src={formData.imageUrl} className="mt-2 h-24 rounded-xl object-cover" onError={(e:any) => e.target.style.display='none'}/>}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                      <Button className="cta-gradient text-white font-bold flex-1" onClick={saveProduct}>
                        {editing ? "Save Changes" : "Create Product"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Product list */}
                {loadingProducts ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-400"/></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {products.map((p: Product) => {
                      const ctry = COUNTRIES.find(c => c.code === p.countryCode);
                      return (
                        <div key={p.id} className="border border-border/50 rounded-2xl bg-card/60 overflow-hidden flex flex-col group hover:border-blue-500/30 transition-colors">
                          <div className="aspect-video relative overflow-hidden bg-black/20">
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e:any) => { e.target.src = `https://placehold.co/400x225/1e293b/94a3b8?text=${encodeURIComponent(p.name)}`; }}/>
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              {ctry?.flag ?? "🌍"} {p.countryCode}
                            </div>
                            {p.stock < 5 && <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">LOW STOCK</div>}
                          </div>
                          <div className="p-3 flex-grow">
                            <p className="font-bold text-sm truncate">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                            <div className="mt-2 flex flex-col gap-0.5 text-[11px]">
                              <span className="text-blue-300">🔵 {p.priceCodes.toLocaleString()} codes</span>
                              <span className="text-slate-300">🥈 {p.priceSilver.toLocaleString()} silver</span>
                              <span className="text-yellow-300">🥇 {p.priceGold.toLocaleString()} gold</span>
                            </div>
                            <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                              <span>📦 {p.stock} stock</span>
                              <span>✅ {p.soldCount} sold</span>
                              {p.avgRating ? <span>⭐ {p.avgRating.toFixed(1)}</span> : null}
                            </div>
                          </div>
                          <div className="p-3 pt-0 flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => startEdit(p)}>
                              <Pencil className="w-3 h-3 mr-1"/>Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => setDeleteId(p.id)}>
                              <Trash2 className="w-3 h-3 mr-1"/>Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Stats tab */}
            {tab === "stats" && (
              <div className="p-5 flex flex-col gap-5 flex-grow overflow-y-auto max-h-[75vh]">
                {!stats ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-400"/></div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Total Orders",   value: stats.totalSold,          icon: Package,     color: "blue" },
                        { label: "Revenue (Codes)", value: stats.totalRevenueCodes.toLocaleString(), icon: TrendingUp, color: "green" },
                        { label: "Low Stock Items", value: stats.lowStockProducts.length, icon: AlertTriangle, color: "red" },
                        { label: "Products",        value: products.length,           icon: Globe,       color: "purple" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className={`p-4 rounded-2xl border bg-${color}-500/5 border-${color}-500/20 space-y-1`}>
                          <Icon className={`w-5 h-5 text-${color}-400`}/>
                          <p className="text-2xl font-black text-foreground">{value}</p>
                          <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wide">{label}</p>
                        </div>
                      ))}
                    </div>
                    {stats.lowStockProducts.length > 0 && (
                      <div>
                        <h4 className="font-bold text-sm mb-2 text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/>Low Stock Alert</h4>
                        <div className="space-y-2">
                          {stats.lowStockProducts.map((p: any) => (
                            <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm">
                              <span className="font-bold text-foreground">{p.name}</span>
                              <span className="text-red-400 font-bold">{p.stock} left</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-muted-foreground">Recent Orders</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {stats.recentOrders.slice(0,20).map((o: any) => (
                          <div key={o.id} className="flex justify-between items-center p-3 rounded-xl border border-border/40 bg-card/40 text-xs">
                            <div>
                              <p className="font-bold text-foreground">{o.productName}</p>
                              <p className="text-muted-foreground">{o.customerInfo?.name || "—"}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-blue-300">{o.totalCodes} codes</p>
                              <p className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <Trash2 className="w-10 h-10 text-red-400 mx-auto"/>
              <h3 className="font-bold text-lg">Delete Product?</h3>
              <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 font-bold" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

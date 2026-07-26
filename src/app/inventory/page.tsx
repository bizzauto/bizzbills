"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Product = { id: string; name: string; sku: string; hsnCode: string; category: string; sellingPrice: number; purchasePrice: number; unit: string; isActive: boolean; inventory: { id: string; quantity: number; minStock: number }[] };
type Warehouse = { id: string; name: string; inventory: { id: string; product: { name: string }; quantity: number }[] };

export default function InventoryPage() {
  const { currentOrgCurrency } = useOrg();
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()).then((d) => { setProducts(d.products ?? []); }),
      fetch("/api/warehouses").then((r) => r.json()).then(setWarehouses),
    ]).finally(() => setLoading(false));
  }, []);

  const totalStock = products.reduce((s, p) => s + p.inventory.reduce((a, i) => a + i.quantity, 0), 0);
  const lowStock = products.filter((p) => p.inventory.some((i) => i.quantity <= i.minStock));
  const totalValue = products.reduce((s, p) => s + p.sellingPrice * p.inventory.reduce((a, i) => a + i.quantity, 0), 0);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Inventory</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Stock Management</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {["overview", "products", "warehouses", "movements"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
                  tab === t ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/5"
                }`}>{t}</button>
            ))}
          </div>
        </div>
      </section>

      {loading ? <div className="text-sm text-slate-400">Loading…</div> : (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-xs text-slate-400">Total Products</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{products.length}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-xs text-slate-400">Total Stock (units)</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{totalStock}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-xs text-slate-400">Stock Value</p>
                  <p className="mt-1 text-2xl font-semibold text-cyan-300">{formatAmount(totalValue, currentOrgCurrency)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-xs text-slate-400">Low Stock Items</p>
                  <p className={`mt-1 text-2xl font-semibold ${lowStock.length > 0 ? "text-amber-300" : "text-emerald-300"}`}>{lowStock.length}</p>
                </div>
              </div>

              {lowStock.length > 0 && (
                <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-5">
                  <h2 className="text-sm font-semibold text-amber-300">⚠ Low Stock Alerts</h2>
                  <div className="mt-2 space-y-1">
                    {lowStock.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs text-slate-300">
                        <span>{p.name} ({p.sku})</span>
                        <span className="text-amber-200">{p.inventory.filter((i) => i.quantity <= i.minStock).map((i) => `${i.quantity} / ${i.minStock}`).join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">All Products</h2>
                  <Link href="/inventory/products/new" className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">
                    + Add Product
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-white/10 text-slate-400">
                      <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">SKU</th><th className="p-3 font-medium">Category</th>
                      <th className="p-3 font-medium text-right">Selling Price</th><th className="p-3 font-medium text-right">Stock</th><th className="p-3 font-medium">Status</th>
                    </tr></thead>
                    <tbody>
                      {products.map((p) => {
                        const stock = p.inventory.reduce((s, i) => s + i.quantity, 0);
                        const low = p.inventory.some((i) => i.quantity <= i.minStock && i.minStock > 0);
                        return (
                          <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                            <td className="p-3 text-white"><Link href={`/inventory/products/${p.id}`} className="hover:text-cyan-300">{p.name}</Link></td>
                            <td className="p-3 text-xs font-mono text-slate-400">{p.sku || "—"}</td>
                            <td className="p-3 text-slate-300">{p.category || "—"}</td>
                            <td className="p-3 text-right text-white">{formatAmount(p.sellingPrice, currentOrgCurrency)}</td>
                            <td className={`p-3 text-right ${low ? "text-amber-300 font-semibold" : "text-slate-300"}`}>{stock}</td>
                            <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{p.isActive ? "Active" : "Inactive"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "products" && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Products</h2>
                <Link href="/inventory/products/new" className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">+ Add Product</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-white/10 text-slate-400">
                    <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">SKU</th><th className="p-3 font-medium">HSN</th><th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium text-right">Selling</th><th className="p-3 font-medium text-right">Purchase</th><th className="p-3 font-medium text-right">Stock</th>
                  </tr></thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-3 text-white"><Link href={`/inventory/products/${p.id}`} className="hover:text-cyan-300">{p.name}</Link></td>
                        <td className="p-3 font-mono text-xs text-slate-400">{p.sku || "—"}</td>
                        <td className="p-3 font-mono text-xs text-slate-400">{p.hsnCode || "—"}</td>
                        <td className="p-3 text-slate-300">{p.category || "—"}</td>
                        <td className="p-3 text-right text-white">{formatAmount(p.sellingPrice, currentOrgCurrency)}</td>
                        <td className="p-3 text-right text-slate-300">{formatAmount(p.purchasePrice, currentOrgCurrency)}</td>
                        <td className="p-3 text-right text-slate-300">{p.inventory.reduce((s, i) => s + i.quantity, 0)} {p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "warehouses" && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Warehouses</h2>
                <Link href="/inventory/warehouses/new" className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">+ Add Warehouse</Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {warehouses.length === 0 && <p className="text-sm text-slate-500 col-span-2">No warehouses yet.</p>}
                {warehouses.map((w) => (
                  <div key={w.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                    <h3 className="text-sm font-semibold text-white">{w.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{w.inventory.length} products</p>
                    <div className="mt-2 text-xs text-slate-500">
                      {w.inventory.slice(0, 5).map((i) => (
                        <div key={i.id} className="flex justify-between py-0.5"><span>{i.product.name}</span><span>{i.quantity}</span></div>
                      ))}
                      {w.inventory.length > 5 && <p className="mt-1 text-slate-400">…and {w.inventory.length - 5} more</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "movements" && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Stock Movements</h2>
              <StockMovementList />
            </div>
          )}
        </>
      )}
    </main>
  );
}

function StockMovementList() {
  const [movements, setMovements] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/inventory/movements").then((r) => r.json()).then(setMovements);
  }, []);

  if (movements.length === 0) return <p className="text-sm text-slate-500">No movements yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-white/10 text-slate-400">
          <th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Product</th><th className="p-3 font-medium">Warehouse</th>
          <th className="p-3 font-medium">Type</th><th className="p-3 font-medium text-right">Qty</th><th className="p-3 font-medium">Reference</th>
        </tr></thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className="border-t border-white/5 hover:bg-white/5">
              <td className="p-3 text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</td>
              <td className="p-3 text-white">{m.product?.name}</td>
              <td className="p-3 text-slate-300">{m.warehouse?.name}</td>
              <td className="p-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  m.type === "in" ? "bg-emerald-500/10 text-emerald-300" :
                  m.type === "out" ? "bg-red-500/10 text-red-300" :
                  "bg-amber-500/10 text-amber-300"
                }`}>{m.type}</span>
              </td>
              <td className={`p-3 text-right font-medium ${m.type === "out" ? "text-red-300" : "text-emerald-300"}`}>{m.quantity}</td>
              <td className="p-3 text-xs font-mono text-slate-400">{m.reference || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrgCurrency } = useOrg();
  const [product, setProduct] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustQty, setAdjustQty] = useState("0");
  const [adjustWh, setAdjustWh] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${params.id}`).then((r) => r.json()).then((d) => setProduct(Array.isArray(d) ? d[0] || d : d)),
      fetch("/api/warehouses").then((r) => r.json()).then((d) => setWarehouses(Array.isArray(d) ? d : [])),
    ]).finally(() => setLoading(false));
  }, [params.id]);

  async function adjustStock() {
    const qty = parseFloat(adjustQty);
    if (!qty || !adjustWh) return;
    await fetch("/api/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: params.id, warehouseId: adjustWh, quantity: qty, notes: adjustNotes }),
    });
    setShowAdjust(false);
    setAdjustQty("0");
    setAdjustNotes("");
    const p = await fetch(`/api/products/${params.id}`).then((r) => r.json());
    setProduct(p);
  }

  if (loading) return <main className="pb-10 text-sm text-slate-400">Loading…</main>;
  if (!product) return <main className="pb-10"><p className="text-slate-400">Product not found.</p></main>;

  return (
    <main className="mx-auto max-w-4xl pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5">← Back</button>
        <h1 className="text-2xl font-semibold text-white">{product.name}</h1>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${product.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{product.isActive ? "Active" : "Inactive"}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">SKU</dt><dd className="text-white font-mono">{product.sku || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">HSN Code</dt><dd className="text-white">{product.hsnCode || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Category</dt><dd className="text-white">{product.category || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Brand</dt><dd className="text-white">{product.brand || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Unit</dt><dd className="text-white">{product.unit}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Selling Price</dt><dd className="text-white font-medium">{formatAmount(product.sellingPrice, currentOrgCurrency)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Purchase Price</dt><dd className="text-slate-300">{formatAmount(product.purchasePrice, currentOrgCurrency)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Tax Rate</dt><dd className="text-white">{product.taxRate}%</dd></div>
            {product.description && <div className="pt-2 border-t border-white/10"><dt className="text-slate-400 mb-1">Description</dt><dd className="text-slate-300">{product.description}</dd></div>}
          </dl>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Stock</h2>
            <button onClick={() => setShowAdjust(!showAdjust)} className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-cyan-400">Adjust Stock</button>
          </div>
          {showAdjust && (
            <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/70 p-3 space-y-2">
              <label className="text-xs text-slate-400">Warehouse<select value={adjustWh} onChange={(e) => setAdjustWh(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none">
                <option value="">Select…</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select></label>
              <label className="text-xs text-slate-400">Quantity (+in / -out)<input type="number" step="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" /></label>
              <label className="text-xs text-slate-400">Notes<input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" /></label>
              <button onClick={adjustStock} className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400">Save</button>
            </div>
          )}
          <div className="space-y-2">
            {product.inventory?.map((i: any) => (
              <div key={i.id} className="flex justify-between rounded-xl border border-white/5 bg-slate-950/50 px-4 py-2.5">
                <span className="text-sm text-white">{i.warehouse?.name}</span>
                <span className={`text-sm font-medium ${i.quantity <= i.minStock ? "text-amber-300" : "text-emerald-300"}`}>
                  {i.quantity} {product.unit} {i.minStock > 0 && <span className="text-xs text-slate-500">(min: {i.minStock})</span>}
                </span>
              </div>
            ))}
            {(!product.inventory || product.inventory.length === 0) && <p className="text-sm text-slate-500">No stock records.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Stock Movements</h2>
        {product.movements?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-white/10 text-slate-400">
                <th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Type</th><th className="p-3 font-medium text-right">Qty</th><th className="p-3 font-medium">Warehouse</th><th className="p-3 font-medium">Reference</th><th className="p-3 font-medium">Notes</th>
              </tr></thead>
              <tbody>
                {product.movements.map((m: any) => (
                  <tr key={m.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.type === "in" ? "bg-emerald-500/10 text-emerald-300" : m.type === "out" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>{m.type}</span></td>
                    <td className={`p-3 text-right font-medium ${m.type === "out" ? "text-red-300" : "text-emerald-300"}`}>{m.quantity}</td>
                    <td className="p-3 text-slate-300">{m.warehouse?.name}</td>
                    <td className="p-3 text-xs font-mono text-slate-400">{m.reference || "—"}</td>
                    <td className="p-3 text-xs text-slate-400">{m.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slate-500">No movements recorded.</p>}
      </div>
    </main>
  );
}

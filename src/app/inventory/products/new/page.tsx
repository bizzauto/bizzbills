"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", hsnCode: "", unit: "pcs", sellingPrice: "", purchasePrice: "", taxRate: "0", category: "", brand: "", description: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sellingPrice: parseFloat(form.sellingPrice) || 0, purchasePrice: parseFloat(form.purchasePrice) || 0, taxRate: parseFloat(form.taxRate) || 0 }),
      });
      if (res.ok) router.push("/inventory");
      else alert("Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl pb-10">
      <h1 className="text-2xl font-semibold text-white mb-6">New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">Name *<input required value={form.name} onChange={set("name")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">SKU<input value={form.sku} onChange={set("sku")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs text-slate-400">Selling Price<input type="number" step="0.01" value={form.sellingPrice} onChange={set("sellingPrice")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">Purchase Price<input type="number" step="0.01" value={form.purchasePrice} onChange={set("purchasePrice")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">Unit<select value={form.unit} onChange={set("unit")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50">
            <option value="pcs">Pieces</option><option value="kg">Kilogram</option><option value="meter">Meter</option><option value="box">Box</option><option value="liter">Liter</option><option value="pack">Pack</option>
          </select></label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs text-slate-400">HSN Code<input value={form.hsnCode} onChange={set("hsnCode")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">Tax Rate (%)<input type="number" step="0.01" value={form.taxRate} onChange={set("taxRate")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">Category<input value={form.category} onChange={set("category")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        </div>
        <label className="text-xs text-slate-400">Brand<input value={form.brand} onChange={set("brand")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        <label className="text-xs text-slate-400">Description<textarea value={form.description} onChange={set("description")} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{saving ? "Saving…" : "Save Product"}</button>
          <button type="button" onClick={() => router.back()} className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
        </div>
      </form>
    </main>
  );
}

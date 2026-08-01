"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";

type Product = { id: string; name: string; sku: string };

type Batch = {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string | null;
  manufactureDate: string | null;
  costPrice: number;
  status: string;
  createdAt: string;
  product: { id: string; name: string; sku: string; unit: string };
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryBadge(expiryDate: string | null, status: string): { label: string; classes: string } {
  if (status === "recalled") return { label: "Recalled", classes: "bg-purple-500/10 text-purple-300" };
  if (status === "expired") return { label: "Expired", classes: "bg-red-500/10 text-red-300" };
  if (!expiryDate) return { label: "Active", classes: "bg-emerald-500/10 text-emerald-300" };

  const days = daysUntil(expiryDate);
  if (days <= 0) return { label: "Expired", classes: "bg-red-500/10 text-red-300" };
  if (days <= 30) return { label: `Expiring (${days}d)`, classes: "bg-amber-500/10 text-amber-300" };
  return { label: "Active", classes: "bg-emerald-500/10 text-emerald-300" };
}

export default function BatchesPage() {
  const { currentOrgCurrency } = useOrg();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProductId, setFilterProductId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", batchNumber: "", quantity: "", expiryDate: "", manufactureDate: "", costPrice: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products ?? [])),
      fetch("/api/inventory/batches").then((r) => r.json()).then(setBatches),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!filterProductId) return batches;
    return batches.filter((b) => b.product.id === filterProductId);
  }, [batches, filterProductId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          batchNumber: form.batchNumber,
          quantity: form.quantity ? parseFloat(form.quantity) : 0,
          expiryDate: form.expiryDate || null,
          manufactureDate: form.manufactureDate || null,
          costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create batch");
      }
      const batch = await res.json();
      setBatches((prev) => [batch, ...prev]);
      setForm({ productId: "", batchNumber: "", quantity: "", expiryDate: "", manufactureDate: "", costPrice: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currentOrgCurrency || "INR" }).format(amount);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Inventory</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Batch / Lot Tracking</h1>
            <p className="mt-1 text-sm text-slate-400">Track product batches with expiry dates and cost prices</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            {showForm ? "Cancel" : "+ Add Batch"}
          </button>
        </div>
      </section>

      {showForm && (
        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">New Batch</h2>
          {error && (
            <div className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>
          )}
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">Product *</label>
              <select
                required
                value={form.productId}
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || "no SKU"})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">Batch Number *</label>
              <input
                required
                value={form.batchNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, batchNumber: e.target.value }))}
                placeholder="e.g. BATCH-001"
                className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
                className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">Cost Price</label>
              <input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                placeholder="0.00"
                className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">Manufacture Date</label>
              <input
                type="date"
                value={form.manufactureDate}
                onChange={(e) => setForm((prev) => ({ ...prev, manufactureDate: e.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-cyan-500 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Batch"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Batches ({filtered.length})</h2>
          <select
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading batches...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No batches found. Create one to start tracking.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Batch #</th>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium text-right">Quantity</th>
                  <th className="p-3 font-medium text-right">Cost Price</th>
                  <th className="p-3 font-medium">Mfg. Date</th>
                  <th className="p-3 font-medium">Expiry Date</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((batch) => {
                  const badge = expiryBadge(batch.expiryDate, batch.status);
                  return (
                    <tr key={batch.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 font-mono text-xs text-cyan-300">{batch.batchNumber}</td>
                      <td className="p-3 text-white">
                        {batch.product.name}
                        {batch.product.sku && <span className="ml-1 text-xs text-slate-500">({batch.product.sku})</span>}
                      </td>
                      <td className="p-3 text-right text-slate-300">{batch.quantity} {batch.product.unit}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(batch.costPrice)}</td>
                      <td className="p-3 text-xs text-slate-400">
                        {batch.manufactureDate ? new Date(batch.manufactureDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3 text-xs text-slate-400">
                        {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

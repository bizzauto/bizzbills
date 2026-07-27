"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewDeliveryChallanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ partyId: "", partyName: "", orderDate: new Date().toISOString().split("T")[0], vehicleNumber: "", transportMode: "Road", notes: "" });
  const [lines, setLines] = useState([{ description: "", quantity: "1", unitPrice: "0", taxRate: "0", hsnCode: "" }]);

  useEffect(() => {
    fetch("/api/parties").then((r) => r.json()).then(setParties);
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products ?? []));
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  function updateLine(idx: number, key: string, val: string) { const copy = [...lines]; (copy[idx] as any)[key] = val; setLines(copy); }
  function addLine() { setLines([...lines, { description: "", quantity: "1", unitPrice: "0", taxRate: "0", hsnCode: "" }]); }
  function removeLine(idx: number) { if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx)); }

  function selectProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const copy = [...lines];
    copy[idx] = { description: p.name, quantity: "1", unitPrice: String(p.sellingPrice), taxRate: String(p.taxRate), hsnCode: p.hsnCode };
    setLines(copy);
  }

  function selectParty(id: string) {
    const p = parties.find((x) => x.id === id);
    setForm({ ...form, partyId: id, partyName: p?.name || "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);
      const taxTotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0) * (parseFloat(l.taxRate) || 0) / 100, 0);
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "delivery_challan",
          orderNumber: `DC-${Date.now()}`,
          partyId: form.partyId, partyName: form.partyName,
          orderDate: new Date(form.orderDate),
          subtotal: +subtotal.toFixed(2), taxTotal: +taxTotal.toFixed(2), total: +(subtotal + taxTotal).toFixed(2),
          notes: form.notes,
          lines: lines.map((l) => ({ description: l.description, quantity: parseFloat(l.quantity) || 0, unitPrice: parseFloat(l.unitPrice) || 0, taxRate: parseFloat(l.taxRate) || 0, hsnCode: l.hsnCode })),
        }),
      });
      if (res.ok) router.push("/delivery-challan");
      else alert("Failed to create delivery challan");
    } finally { setSaving(false); }
  }

  return (
    <main className="mx-auto max-w-3xl pb-10">
      <h1 className="text-2xl font-semibold text-white mb-6">New Delivery Challan</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">Date<input type="date" value={form.orderDate} onChange={set("orderDate")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">Transport Mode<select value={form.transportMode} onChange={set("transportMode")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"><option>Road</option><option>Rail</option><option>Air</option><option>Ship</option></select></label>
        </div>
        <label className="text-xs text-slate-400">Vehicle Number<input type="text" value={form.vehicleNumber} onChange={set("vehicleNumber")} placeholder="e.g. MH-12-AB-1234" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>
        <label className="text-xs text-slate-400">Party{parties.length > 0 ? <select value={form.partyId} onChange={(e) => selectParty(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"> <option value="">Select…</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select> : <input value={form.partyName} onChange={set("partyName")} placeholder="Party name" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" />}</label>

        <fieldset className="border-t border-white/10 pt-4">
          <legend className="text-xs font-medium text-cyan-300 mb-3">Items</legend>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-end rounded-xl border border-white/5 bg-slate-950/50 p-3">
                {products.length > 0 && <select onChange={(e) => selectProduct(i, e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none"><option value="">Select product…</option>{products.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
                <input placeholder="Description" value={l.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="flex-1 min-w-[120px] rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <input type="number" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <input type="number" step="0.01" placeholder="Price" value={l.unitPrice} onChange={(e) => updateLine(i, "unitPrice", e.target.value)} className="w-24 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <input type="number" step="0.01" placeholder="Tax %" value={l.taxRate} onChange={(e) => updateLine(i, "taxRate", e.target.value)} className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <button type="button" onClick={() => removeLine(i)} className="text-xs text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} className="mt-2 rounded-full border border-dashed border-white/20 px-4 py-1.5 text-xs text-slate-400 hover:border-white/40 hover:text-white">+ Add Line</button>
        </fieldset>

        <label className="text-xs text-slate-400">Notes<textarea value={form.notes} onChange={set("notes")} rows={2} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{saving ? "Saving…" : "Save Challan"}</button>
          <button type="button" onClick={() => router.back()} className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
        </div>
      </form>
    </main>
  );
}

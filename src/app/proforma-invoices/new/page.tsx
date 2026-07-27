"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewProformaInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerGstin: "", validUntil: "", notes: "" });
  const [lines, setLines] = useState([{ description: "", quantity: "1", unitPrice: "0", taxRate: "0", hsnCode: "" }]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  function updateLine(idx: number, key: string, val: string) { const copy = [...lines]; (copy[idx] as any)[key] = val; setLines(copy); }
  function addLine() { setLines([...lines, { description: "", quantity: "1", unitPrice: "0", taxRate: "0", hsnCode: "" }]); }
  function removeLine(idx: number) { if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx)); }

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const taxTotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0) * (parseFloat(l.taxRate) || 0) / 100, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/proforma-invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName, customerGstin: form.customerGstin, validUntil: form.validUntil, notes: form.notes,
          subtotal: +subtotal.toFixed(2), taxTotal: +taxTotal.toFixed(2), total: +(subtotal + taxTotal).toFixed(2),
          lines: lines.map((l) => ({ description: l.description, quantity: parseFloat(l.quantity) || 0, unitPrice: parseFloat(l.unitPrice) || 0, taxRate: parseFloat(l.taxRate) || 0, hsnCode: l.hsnCode })),
        }),
      });
      if (res.ok) { const data = await res.json(); router.push(`/proforma-invoices/${data.id}`); }
      else alert("Failed to create proforma invoice");
    } finally { setSaving(false); }
  }

  return (
    <main className="mx-auto max-w-3xl pb-10">
      <h1 className="text-2xl font-semibold text-white mb-6">New Proforma Invoice</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">Customer Name *<input type="text" value={form.customerName} onChange={set("customerName")} required placeholder="Customer name" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">GSTIN<input type="text" value={form.customerGstin} onChange={(e) => setForm({ ...form, customerGstin: e.target.value.toUpperCase() })} placeholder="22AABCU9603R1ZL" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>
        </div>
        <label className="text-xs text-slate-400">Valid Until<input type="date" value={form.validUntil} onChange={set("validUntil")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>

        <fieldset className="border-t border-white/10 pt-4">
          <legend className="text-xs font-medium text-cyan-300 mb-3">Line Items</legend>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-end rounded-xl border border-white/5 bg-slate-950/50 p-3">
                <input placeholder="Description" value={l.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="flex-1 min-w-[120px] rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <input type="number" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <input type="number" step="0.01" placeholder="Price" value={l.unitPrice} onChange={(e) => updateLine(i, "unitPrice", e.target.value)} className="w-24 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <input type="number" step="0.01" placeholder="Tax %" value={l.taxRate} onChange={(e) => updateLine(i, "taxRate", e.target.value)} className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <input placeholder="HSN" value={l.hsnCode} onChange={(e) => updateLine(i, "hsnCode", e.target.value)} className="w-20 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none" />
                <button type="button" onClick={() => removeLine(i)} className="text-xs text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} className="mt-2 rounded-full border border-dashed border-white/20 px-4 py-1.5 text-xs text-slate-400 hover:border-white/40 hover:text-white">+ Add Line</button>
        </fieldset>

        <div className="space-y-1 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="text-white">₹{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Tax</span><span className="text-white">₹{taxTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-lg font-semibold"><span className="text-white">Total</span><span className="text-cyan-300">₹{(subtotal + taxTotal).toFixed(2)}</span></div>
        </div>

        <label className="text-xs text-slate-400">Notes<textarea value={form.notes} onChange={set("notes")} rows={2} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{saving ? "Saving…" : "Save Proforma"}</button>
          <button type="button" onClick={() => router.back()} className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
        </div>
      </form>
    </main>
  );
}

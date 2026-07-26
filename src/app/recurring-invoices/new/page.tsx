"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LineForm = { description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode: string };

export default function NewRecurringInvoicePage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [interval, setIntervalCount] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [lines, setLines] = useState<LineForm[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18, hsnCode: "" }]);
  const [saving, setSaving] = useState(false);

  function updateLine(index: number, field: keyof LineForm, value: string | number) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, taxRate: 18, hsnCode: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxTotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * l.taxRate) / 100, 0);
  const total = subtotal + taxTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/recurring-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerGstin: customerGstin || undefined,
          frequency,
          interval,
          startDate,
          endDate: endDate || undefined,
          lines,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const inv = await res.json();
      router.push(`/recurring-invoices/${inv.id}`);
    } catch {
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Automation</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">New Recurring Invoice</h1>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Customer & Schedule</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-400">Customer Name *</span>
              <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Customer GSTIN</span>
              <input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Frequency *</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Interval *</span>
              <input type="number" min={1} value={interval} onChange={(e) => setIntervalCount(parseInt(e.target.value) || 1)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Start Date *</span>
              <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">End Date (optional)</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none" />
            </label>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Items</h2>
            <button type="button" onClick={addLine}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10">
              + Add Line
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-2">Description</th>
                  <th className="p-2">HSN</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">GST%</th>
                  <th className="p-2">Total</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-2">
                      <input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)}
                        className="w-36 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none sm:w-48" />
                    </td>
                    <td className="p-2">
                      <input value={line.hsnCode} onChange={(e) => updateLine(i, "hsnCode", e.target.value)}
                        className="w-20 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} step="0.01" value={line.quantity} onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} step="0.01" value={line.unitPrice} onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} max={100} value={line.taxRate} onChange={(e) => updateLine(i, "taxRate", parseFloat(e.target.value) || 0)}
                        className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none" />
                    </td>
                    <td className="p-2 text-xs text-white">{(line.quantity * line.unitPrice).toFixed(2)}</td>
                    <td className="p-2">
                      <button type="button" onClick={() => removeLine(i)} className="text-xs text-red-400 hover:text-red-300">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-right text-sm">
            <div className="text-slate-400">Subtotal: <span className="font-semibold text-white">{subtotal.toFixed(2)}</span></div>
            <div className="text-slate-400">Tax: <span className="font-semibold text-white">{taxTotal.toFixed(2)}</span></div>
            <div className="text-white">Total: <span className="font-semibold">{total.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/10">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
            {saving ? "Creating…" : "Create Schedule"}
          </button>
        </div>
      </form>
    </main>
  );
}

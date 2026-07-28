"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  { value: "rent", label: "Rent" }, { value: "utilities", label: "Utilities" }, { value: "salary", label: "Salary" },
  { value: "office", label: "Office" }, { value: "travel", label: "Travel" }, { value: "marketing", label: "Marketing" },
  { value: "software", label: "Software" }, { value: "food", label: "Food & Dining" }, { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "other", date: new Date().toISOString().split("T")[0], paymentMethod: "cash", notes: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: form.amount }),
      });
      if (res.ok) router.push("/expenses");
      else alert("Failed to create expense");
    } finally { setSaving(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="mx-auto max-w-lg pb-10">
      <h1 className="text-2xl font-semibold text-white mb-6">New Expense</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <label className="text-xs text-slate-400">Description *<input type="text" value={form.description} onChange={set("description")} required placeholder="What was this for?" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">Amount *<input type="number" step="0.01" min="0" value={form.amount} onChange={set("amount")} required placeholder="0.00" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">Date<input type="date" value={form.date} onChange={set("date")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">Category<select value={form.category} onChange={set("category")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none">{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          <label className="text-xs text-slate-400">Payment Method<select value={form.paymentMethod} onChange={set("paymentMethod")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option><option value="upi">UPI</option></select></label>
        </div>
        <label className="text-xs text-slate-400">Notes<textarea value={form.notes} onChange={set("notes")} rows={2} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" /></label>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{saving ? "Saving…" : "Save Expense"}</button>
          <button type="button" onClick={() => router.back()} className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
        </div>
      </form>
    </main>
  );
}
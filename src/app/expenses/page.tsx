"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Expense = { id: string; description: string; amount: number; category: string; date: string; paymentMethod: string; isRecurring: boolean };

const categories = ["rent", "utilities", "salary", "office", "travel", "marketing", "software", "food", "transport", "other"] as const;

export default function ExpensesPage() {
  const { currentOrgCurrency } = useOrg();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    fetch("/api/expenses").then((r) => r.json()).then((d) => { setExpenses(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = categoryFilter ? expenses.filter((e) => e.category === categoryFilter) : expenses;

  const totalAmount = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const categoryTotals = useMemo(() => {
    const sums: Record<string, number> = {};
    filtered.forEach((e) => { sums[e.category] = (sums[e.category] || 0) + e.amount; });
    return Object.entries(sums).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  const catLabels: Record<string, string> = { rent: "Rent", utilities: "Utilities", salary: "Salary", office: "Office", travel: "Travel", marketing: "Marketing", software: "Software", food: "Food & Dining", transport: "Transport", other: "Other" };

  const payMethodColors: Record<string, string> = { cash: "bg-emerald-500/10 text-emerald-300", bank_transfer: "bg-cyan-500/10 text-cyan-300", card: "bg-amber-500/10 text-amber-300", upi: "bg-blue-500/10 text-blue-300" };

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Expenses</h1>
          </div>
          <Link href="/expenses/new" className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">+ New Expense</Link>
        </div>
      </section>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter("")} className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${!categoryFilter ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/5"}`}>All</button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setCategoryFilter(cat)} className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${categoryFilter === cat ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/5"}`}>{catLabels[cat]}</button>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* List */}
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No expenses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Description</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Category</th><th className="p-3 font-medium text-right">Amount</th><th className="p-3 font-medium">Method</th>
                </tr></thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 text-white font-medium">{e.description}{e.isRecurring ? <span className="ml-2 text-[10px] text-cyan-400">⟳</span> : ""}</td>
                      <td className="p-3 text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="p-3"><span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">{catLabels[e.category] || e.category}</span></td>
                      <td className="p-3 text-right text-white font-medium">{formatAmount(e.amount, currentOrgCurrency)}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${payMethodColors[e.paymentMethod] || "bg-slate-500/10 text-slate-300"}`}>{e.paymentMethod}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-sm text-slate-400 mb-1">Total Expenses</h2>
            <p className="text-3xl font-bold text-white">{formatAmount(totalAmount, currentOrgCurrency)}</p>
            <p className="text-xs text-slate-500 mt-2">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-sm font-semibold text-white mb-3">Category Breakdown</h2>
            {categoryTotals.length === 0 ? (
              <p className="text-xs text-slate-500">No data</p>
            ) : (
              <div className="space-y-2">
                {categoryTotals.map(([cat, amt]) => {
                  const pct = totalAmount > 0 ? (amt / totalAmount * 100).toFixed(0) : "0";
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{catLabels[cat] || cat}</span>
                        <span className="text-white">{formatAmount(amt, currentOrgCurrency)} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
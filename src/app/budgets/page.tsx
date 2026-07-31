"use client";

import { useState, useEffect, useMemo } from "react";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Budget = {
  id: string;
  category: string;
  amount: number;
  period: string;
  startDate: string;
};

type BudgetActual = Budget & {
  spent: number;
  remaining: number;
  percentage: number;
};

const EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "salary",
  "office",
  "travel",
  "marketing",
  "software",
  "food",
  "transport",
  "other",
];

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  salary: "Salary",
  office: "Office",
  travel: "Travel",
  marketing: "Marketing",
  software: "Software",
  food: "Food & Dining",
  transport: "Transport",
  other: "Other",
};

const PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

function utilizationColor(pct: number): string {
  if (pct >= 90) return "text-red-400";
  if (pct >= 70) return "text-amber-400";
  return "text-emerald-400";
}

function utilizationBg(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function barColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-cyan-500";
}

export default function BudgetsPage() {
  const { currentOrgCurrency } = useOrg();
  const [budgetsActuals, setBudgetsActuals] = useState<BudgetActual[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetch("/api/budgets/actuals")
      .then((r) => r.json())
      .then((d) => {
        setBudgetsActuals(Array.isArray(d.budgets) ? d.budgets : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const totalBudget = budgetsActuals.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgetsActuals.reduce((s, b) => s + b.spent, 0);
    const remaining = Math.max(0, totalBudget - totalSpent);
    const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    return { totalBudget, totalSpent, remaining, utilization };
  }, [budgetsActuals]);

  const maxBarAmount = useMemo(() => {
    const max = Math.max(
      ...budgetsActuals.map((b) => Math.max(b.amount, b.spent)),
      1
    );
    return max;
  }, [budgetsActuals]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !amount || !startDate) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, period, startDate }),
      });

      if (res.ok) {
        // Refresh budget vs actuals
        const actualsRes = await fetch("/api/budgets/actuals");
        const actualsData = await actualsRes.json();
        setBudgetsActuals(Array.isArray(actualsData.budgets) ? actualsData.budgets : []);
        setAmount("");
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Budget Management</h1>
            <p className="mt-1 text-sm text-slate-400">
              Set spending limits by category and track actuals against budgets
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            {showForm ? "Cancel" : "+ New Budget"}
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Total Budget</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatAmount(kpis.totalBudget, currentOrgCurrency)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">{budgetsActuals.length} categories</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            {formatAmount(kpis.totalSpent, currentOrgCurrency)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Remaining</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {formatAmount(kpis.remaining, currentOrgCurrency)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Utilization</p>
          <p className={`mt-1 text-2xl font-bold ${utilizationColor(kpis.utilization)}`}>
            {kpis.utilization}%
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${utilizationBg(kpis.utilization)}`}
              style={{ width: `${Math.min(kpis.utilization, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <section className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-900/80 p-6 backdrop-blur">
          <h2 className="text-sm font-semibold text-white mb-4">Create Budget</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Budget Amount *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Period *</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-cyan-500 px-6 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Create Budget"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Bar Chart: Budget vs Actual per Category */}
      {budgetsActuals.length > 0 && (
        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-sm font-semibold text-white mb-4">Budget vs Actual by Category</h2>
          <div className="space-y-4">
            {budgetsActuals.map((b) => (
              <div key={b.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">{CATEGORY_LABELS[b.category] || b.category}</span>
                  <span className="text-slate-400">
                    {formatAmount(b.spent, currentOrgCurrency)} / {formatAmount(b.amount, currentOrgCurrency)}
                  </span>
                </div>
                {/* Budget bar (background) */}
                <div className="relative h-5 rounded-full bg-slate-800 overflow-hidden">
                  {/* Budget line */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-slate-600/40"
                    style={{ width: `${(b.amount / maxBarAmount) * 100}%` }}
                  />
                  {/* Actual spending bar */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor(b.percentage)}`}
                    style={{ width: `${Math.min((b.spent / maxBarAmount) * 100, 100)}%` }}
                  />
                  {/* Percentage label */}
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                    {b.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-600/40" /> Budget
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-500" /> Spent (under 70%)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Spent (70-90%)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Spent (over 90%)
            </span>
          </div>
        </section>
      )}

      {/* Table */}
      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : budgetsActuals.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No budgets found. Create your first budget above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Period</th>
                  <th className="p-3 font-medium text-right">Budget</th>
                  <th className="p-3 font-medium text-right">Spent</th>
                  <th className="p-3 font-medium text-right">Remaining</th>
                  <th className="p-3 font-medium text-right">% Used</th>
                </tr>
              </thead>
              <tbody>
                {budgetsActuals.map((b) => (
                  <tr key={b.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 font-medium text-white">
                      {CATEGORY_LABELS[b.category] || b.category}
                    </td>
                    <td className="p-3 text-xs text-slate-400 capitalize">{b.period}</td>
                    <td className="p-3 text-right text-white">
                      {formatAmount(b.amount, currentOrgCurrency)}
                    </td>
                    <td className="p-3 text-right text-amber-300 font-medium">
                      {formatAmount(b.spent, currentOrgCurrency)}
                    </td>
                    <td className="p-3 text-right text-emerald-300">
                      {formatAmount(b.remaining, currentOrgCurrency)}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${utilizationColor(b.percentage)}`}>
                        {b.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

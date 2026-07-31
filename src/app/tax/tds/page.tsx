"use client";

import { useState, useEffect, useMemo } from "react";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type TdsEntry = {
  id: string;
  partyName: string;
  pan: string;
  section: string;
  amount: number;
  tdsRate: number;
  tdsAmount: number;
  date: string;
  invoiceRef: string;
};

const TDS_SECTIONS: Record<string, { label: string; rate: number }> = {
  "194C": { label: "Contractor", rate: 1 },
  "194J": { label: "Professional", rate: 10 },
  "194H": { label: "Commission", rate: 5 },
  "194I": { label: "Rent", rate: 10 },
};

export default function TdsPage() {
  const { currentOrgCurrency } = useOrg();
  const [entries, setEntries] = useState<TdsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [partyName, setPartyName] = useState("");
  const [pan, setPan] = useState("");
  const [section, setSection] = useState("194C");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceRef, setInvoiceRef] = useState("");

  useEffect(() => {
    fetch("/api/tax/tds")
      .then((r) => r.json())
      .then((d) => {
        setEntries(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const totalBase = entries.reduce((s, e) => s + e.amount, 0);
    const totalTds = entries.reduce((s, e) => s + e.tdsAmount, 0);
    return { totalBase, totalTds, count: entries.length };
  }, [entries]);

  const sectionTotals = useMemo(() => {
    const map: Record<string, { base: number; tds: number; count: number }> = {};
    for (const e of entries) {
      if (!map[e.section]) map[e.section] = { base: 0, tds: 0, count: 0 };
      map[e.section].base += e.amount;
      map[e.section].tds += e.tdsAmount;
      map[e.section].count += 1;
    }
    return map;
  }, [entries]);

  const tdsRate = TDS_SECTIONS[section]?.rate || 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyName || !pan || !amount || !date) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tax/tds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyName, pan, section, amount, tdsRate, date, invoiceRef }),
      });

      if (res.ok) {
        const entry = await res.json();
        setEntries((prev) => [entry, ...prev]);
        setPartyName("");
        setPan("");
        setAmount("");
        setInvoiceRef("");
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
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Tax Compliance</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">TDS Management</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track Tax Deducted at Source across sections 194C, 194J, 194H, 194I
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            {showForm ? "Cancel" : "+ New TDS Entry"}
          </button>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Total TDS Deducted</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            {formatAmount(summary.totalTds, currentOrgCurrency)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">{summary.count} entries</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Total Base Amount</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatAmount(summary.totalBase, currentOrgCurrency)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-xs text-slate-400">Net Payable</p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">
            {formatAmount(summary.totalBase - summary.totalTds, currentOrgCurrency)}
          </p>
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="grid gap-4 sm:grid-cols-4">
        {Object.entries(TDS_SECTIONS).map(([sec, info]) => {
          const totals = sectionTotals[sec];
          return (
            <div
              key={sec}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">{sec}</span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                  {info.rate}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{info.label}</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatAmount(totals?.tds || 0, currentOrgCurrency)}
              </p>
              <p className="text-[10px] text-slate-500">{totals?.count || 0} entries</p>
            </div>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <section className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-900/80 p-6 backdrop-blur">
          <h2 className="text-sm font-semibold text-white mb-4">New TDS Entry</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Party Name *</label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                placeholder="Vendor / Payee"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">PAN *</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                required
                maxLength={10}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none uppercase"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Section *</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                {Object.entries(TDS_SECTIONS).map(([sec, info]) => (
                  <option key={sec} value={sec}>
                    {sec} - {info.label} ({info.rate}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Base Amount *</label>
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
              <label className="mb-1 block text-[10px] text-slate-400">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">Invoice Ref</label>
              <input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                placeholder="INV-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">TDS Rate (%)</label>
              <input
                type="text"
                value={`${tdsRate}%`}
                readOnly
                className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">TDS Amount</label>
              <input
                type="text"
                value={formatAmount(amount ? (parseFloat(amount) * tdsRate) / 100 : 0, currentOrgCurrency)}
                readOnly
                className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-400"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-cyan-500 px-6 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save TDS Entry"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Table */}
      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No TDS entries found. Add your first entry above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Party</th>
                  <th className="p-3 font-medium">PAN</th>
                  <th className="p-3 font-medium">Section</th>
                  <th className="p-3 font-medium text-right">Base Amount</th>
                  <th className="p-3 font-medium text-right">TDS Rate</th>
                  <th className="p-3 font-medium text-right">TDS Amount</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Invoice Ref</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white font-medium">{e.partyName}</td>
                    <td className="p-3 font-mono text-xs text-slate-300">{e.pan}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                        {e.section}
                      </span>
                    </td>
                    <td className="p-3 text-right text-white">{formatAmount(e.amount, currentOrgCurrency)}</td>
                    <td className="p-3 text-right text-slate-300">{e.tdsRate}%</td>
                    <td className="p-3 text-right font-medium text-amber-300">
                      {formatAmount(e.tdsAmount, currentOrgCurrency)}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-400">{e.invoiceRef || "--"}</td>
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

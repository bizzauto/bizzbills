"use client";

import { useState, useEffect } from "react";

type LedgerEntry = {
  id: string;
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  account: { id: string; name: string; code: string; type: string };
  journalEntry: { id: string; entryNumber: string; date: string; description: string } | null;
};

export default function LedgerPage() {
  const [accountId, setAccountId] = useState("");
  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/accounting/chart-of-accounts");
      const data = await res.json();
      setAccounts(data);
    } catch {
      setAccounts([]);
    }
  }

  async function fetchLedger() {
    if (!accountId) {
      setMessage("Please select an account");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({ accountId, fromDate, toDate });
      const res = await fetch(`/api/accounting/ledger?${params}`);
      const data = await res.json();
      setEntries(data);

      if (data.length === 0) {
        setMessage("No ledger entries found for the selected period.");
      }
    } catch {
      setMessage("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section>
        <h1 className="text-2xl font-semibold text-white">Account Ledger</h1>
        <p className="mt-1 text-sm text-slate-400">View the running balance for any account.</p>
      </section>

      <div className="flex flex-wrap gap-3 items-end rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <label className="text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">Account</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50">
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.type})</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
        </label>
        <label className="text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
        </label>
        <button onClick={fetchLedger} disabled={loading} className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
          {loading ? "Loading…" : "View Ledger"}
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          {message}
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <p className="text-sm text-slate-400">
              Account: <span className="text-white font-medium">{entries[0]?.account.name}</span> — Running Balance
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Entry #</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Debit</th>
                  <th className="px-4 py-3 font-medium text-right">Credit</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-slate-300">{new Date(entry.entryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{entry.journalEntry?.entryNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{entry.description}</td>
                    <td className="px-4 py-3 text-right text-emerald-300 font-medium">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-red-300 font-medium">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">₹{entry.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
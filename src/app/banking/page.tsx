"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type BankAccount = { id: string; name: string; bankName: string; accountNumber: string; ifscCode: string; branch: string; type: string; currentBalance: number; openingBalance: number; isActive: boolean };

export default function BankingPage() {
  const { currentOrgCurrency } = useOrg();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", bankName: "", accountNumber: "", ifscCode: "", branch: "", type: "savings", openingBalance: "0" });

  const fetchAccounts = () => fetch("/api/bank-accounts").then((r) => r.json()).then(setAccounts);
  useEffect(() => { fetchAccounts(); }, []);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/bank-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, openingBalance: parseFloat(form.openingBalance) || 0, currentBalance: parseFloat(form.openingBalance) || 0 }) });
    setShowForm(false);
    setForm({ name: "", bankName: "", accountNumber: "", ifscCode: "", branch: "", type: "savings", openingBalance: "0" });
    fetchAccounts();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Banking</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">+ Add Account</button>
        </div>
      </section>

      {showForm && (
        <form onSubmit={createAccount} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-400">Name *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">Bank Name<input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">Account No.<input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">IFSC<input value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"><option value="savings">Savings</option><option value="current">Current</option><option value="credit_card">Credit Card</option></select></label>
            <label className="text-xs text-slate-400">Opening Balance<input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" /></label>
          </div>
          <button type="submit" className="rounded-full bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400">Save Account</button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {accounts.length === 0 && <p className="col-span-2 text-sm text-slate-500">No bank accounts added.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-white">{a.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{a.isActive ? "Active" : "Inactive"}</span>
            </div>
            <p className="text-xs text-slate-400">{a.bankName}{a.branch ? ` — ${a.branch}` : ""}</p>
            <p className="text-xs font-mono text-slate-500 mt-1">{a.accountNumber ? `****${a.accountNumber.slice(-4)}` : ""}{a.ifscCode ? ` | ${a.ifscCode}` : ""}</p>
            <p className="mt-3 text-xl font-semibold text-cyan-300">{formatAmount(a.currentBalance, currentOrgCurrency)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

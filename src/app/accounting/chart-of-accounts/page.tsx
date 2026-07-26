"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  isActive: boolean;
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("EXPENSE");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
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
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/accounting/chart-of-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, type, parentId: parentId || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }

      setMessage("Account created successfully");
      setCode("");
      setName("");
      setType("EXPENSE");
      setParentId("");
      setShowForm(false);
      fetchAccounts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this account?")) return;

    try {
      const res = await fetch(`/api/accounting/chart-of-accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchAccounts();
    } catch {
      setMessage("Failed to delete account");
    }
  }

  const typeColors: Record<string, string> = {
    ASSET: "bg-blue-500/15 text-blue-300",
    LIABILITY: "bg-amber-500/15 text-amber-300",
    EQUITY: "bg-emerald-500/15 text-emerald-300",
    INCOME: "bg-emerald-500/15 text-emerald-300",
    EXPENSE: "bg-red-500/15 text-red-300",
  };

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your organization&apos;s accounting accounts.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          {showForm ? "Cancel" : "+ New Account"}
        </button>
      </section>

      {message && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Code</span>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required className="w-32 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-48 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50">
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Parent</span>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50">
              <option value="">None</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
            {saving ? "Saving…" : "Add Account"}
          </button>
        </form>
      )}

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No accounts yet. Create your first account.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accounts.map((acct) => (
                  <tr key={acct.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-slate-300">{acct.code}</td>
                    <td className="px-4 py-3 text-white">{acct.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[acct.type] ?? "bg-slate-500/15 text-slate-300"}`}>
                        {acct.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`h-2 w-2 rounded-full ${acct.isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(acct.id)} className="text-sm text-red-400 transition hover:text-red-300">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
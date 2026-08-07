"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/currency";
import { useOrg } from "@/components/OrgProvider";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type LineItem = {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
};

export default function NewJournalEntryPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [entryNumber, setEntryNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/accounting/chart-of-accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setAccounts([]);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  function addLine() {
    setLines((prev) => [...prev, { accountId: "", debit: 0, credit: 0, description: "" }]);
  }

  function updateLine(index: number, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function calculateTotals() {
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const { isBalanced } = calculateTotals();
    if (!isBalanced) {
      setMessage("Debits and credits must balance before posting.");
      setSaving(false);
      return;
    }

    if (!entryNumber.trim()) {
      setMessage("Entry number is required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/accounting/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryNumber,
          date,
          description,
          reference,
          lines,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create entry");
      }

      setMessage("Journal entry created successfully!");
      setEntryNumber("");
      setDescription("");
      setReference("");
      setLines([]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const { currentOrgCurrency } = useOrg();
  const { totalDebit, totalCredit, isBalanced } = calculateTotals();

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">New Journal Entry</h1>
          <p className="mt-1 text-sm text-slate-400">Create a double-entry transaction.</p>
        </div>
        <Link href="/accounting/journal-entries" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
          ← Back to Entries
        </Link>
      </section>

      {message && (
        <div className={`rounded-xl border p-3 text-sm ${isBalanced === false && message.includes("balance") ? "border-amber-400/20 bg-amber-500/10 text-amber-200" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Entry Number *</span>
            <input type="text" value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} required placeholder="JE-001" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
          </label>
          <label className="text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Date *</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
          </label>
        </div>

        <label className="block text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">Description</span>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Transaction description" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
        </label>

        <label className="block text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">Reference</span>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice #, PO #, etc." className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50" />
        </label>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-white">Journal Lines</h3>
            <button type="button" onClick={addLine} className="rounded-full bg-cyan-500/15 px-3 py-1.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/25">
              + Add Line
            </button>
          </div>

          {lines.length === 0 && (
            <p className="mb-4 text-sm text-slate-400">No lines yet. Add at least one debit and one credit line.</p>
          )}

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="flex flex-wrap gap-3 items-end rounded-xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs text-slate-400 mb-1">Account</label>
                  <select value={line.accountId} onChange={(e) => updateLine(index, "accountId", e.target.value)} required className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50">
                    <option value="">Select account...</option>
                    {accounts.map((acct) => (
                      <option key={acct.id} value={acct.id}>{acct.code} — {acct.name} ({acct.type})</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-xs text-slate-400 mb-1">Debit</label>
                  <input type="number" step="0.01" min="0" value={line.debit || ""} onChange={(e) => updateLine(index, "debit", parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50" />
                </div>
                <div className="w-28">
                  <label className="block text-xs text-slate-400 mb-1">Credit</label>
                  <input type="number" step="0.01" min="0" value={line.credit || ""} onChange={(e) => updateLine(index, "credit", parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <input type="text" value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} placeholder="Line description" className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50" />
                </div>
                <button type="button" onClick={() => removeLine(index)} className="text-red-400 hover:text-red-300 px-2">
                  ✕
                </button>
              </div>
            ))}
          </div>

          {lines.length > 0 && (
            <div className="mt-4 flex gap-6 text-sm">
              <span className="text-slate-400">Total Debit: <span className="font-semibold text-white">{formatAmount(totalDebit, currentOrgCurrency)}</span></span>
              <span className="text-slate-400">Total Credit: <span className="font-semibold text-white">{formatAmount(totalCredit, currentOrgCurrency)}</span></span>
              <span className={`font-medium ${isBalanced ? "text-emerald-400" : "text-red-400"}`}>
                {isBalanced ? "✓ Balanced" : "✗ Unbalanced"}
              </span>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving || lines.length === 0} className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
          {saving ? "Posting…" : "Post Journal Entry"}
        </button>
      </form>
    </main>
  );
}
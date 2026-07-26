"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/currency";

type DebitNoteSummary = {
  id: string;
  debitNoteNumber: string;
  supplierName: string;
  currency: string;
  reason: string;
  total: number;
  status: string;
  date: string;
  invoice: { invoiceNumber: string } | null;
};

export default function DebitNotesPage() {
  const [notes, setNotes] = useState<DebitNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotes() {
    const res = await fetch("/api/debit-notes");
    const data = await res.json();
    setNotes(data);
    setLoading(false);
  }

  useEffect(() => { fetchNotes(); }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Purchases</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Debit Notes</h1>
            <p className="mt-1 text-sm text-slate-400">Purchase returns and debit from suppliers</p>
          </div>
          <Link
            href="/debit-notes/new"
            className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + New Debit Note
          </Link>
        </div>
      </section>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : notes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400">No debit notes yet.</p>
            <p className="mt-1 text-xs text-slate-500">Create a debit note to record a purchase return.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Supplier</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Reason</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => (
                  <tr key={n.id} className="border-t border-white/5 hover:bg-slate-950/50">
                    <td className="p-3 font-semibold text-white">{n.debitNoteNumber}</td>
                    <td className="p-3 text-slate-300">{n.supplierName}</td>
                    <td className="p-3 text-white">{formatAmount(n.total, n.currency)}</td>
                    <td className="p-3 text-slate-400 capitalize">{n.reason}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        n.status === "issued" ? "bg-emerald-500/10 text-emerald-300" :
                        n.status === "void" ? "bg-red-500/10 text-red-300" :
                        "bg-slate-500/10 text-slate-300"
                      }`}>{n.status}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">{new Date(n.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Link href={`/debit-notes/${n.id}`} className="text-xs text-cyan-300 hover:text-cyan-200">View →</Link>
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

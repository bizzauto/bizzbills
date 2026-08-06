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

const STATUS_BADGE: Record<string, string> = {
  issued: "badge-success", void: "badge-danger",
};

export default function DebitNotesPage() {
  const [notes, setNotes] = useState<DebitNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotes() {
    const res = await fetch("/api/debit-notes");
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchNotes(); }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--doc-debit)" }}>Purchases</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Debit Notes</h1>
            <p className="mt-1 text-sm text-muted">Purchase returns and debit from suppliers</p>
          </div>
          <Link href="/debit-notes/new" className="btn-primary">+ New Debit Note</Link>
        </div>
      </section>

      <div className="section-card overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : notes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No debit notes yet.</p>
            <p className="mt-1 text-xs text-muted">Create a debit note to record a purchase return.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-default text-muted">
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
                  <tr key={n.id} className="border-t border-default hover-brighten">
                    <td className="p-3 font-semibold text-default">{n.debitNoteNumber}</td>
                    <td className="p-3 text-muted">{n.supplierName}</td>
                    <td className="p-3 text-default">{formatAmount(n.total, n.currency)}</td>
                    <td className="p-3 text-muted capitalize">{n.reason}</td>
                    <td className="p-3">
                      <span className={STATUS_BADGE[n.status] || "badge-default"}>{n.status}</span>
                    </td>
                    <td className="p-3 text-xs text-muted">{new Date(n.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Link href={`/debit-notes/${n.id}`} className="text-xs text-accent-light hover:text-accent">View &rarr;</Link>
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

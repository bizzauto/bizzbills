"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/currency";

type CreditNoteSummary = {
  id: string;
  creditNoteNumber: string;
  customerName: string;
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

export default function CreditNotesPage() {
  const [notes, setNotes] = useState<CreditNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotes() {
    const res = await fetch("/api/credit-notes");
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
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--doc-credit)" }}>Returns</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Credit Notes</h1>
            <p className="mt-1 text-sm text-muted">Sales returns and credit issued to customers</p>
          </div>
          <Link href="/credit-notes/new" className="btn-primary">+ New Credit Note</Link>
        </div>
      </section>

      <div className="section-card overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : notes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No credit notes yet.</p>
            <p className="mt-1 text-xs text-muted">Create a credit note from an invoice to process a sales return.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-default text-muted">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Customer</th>
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
                    <td className="p-3 font-semibold text-default">{n.creditNoteNumber}</td>
                    <td className="p-3 text-muted">{n.customerName}</td>
                    <td className="p-3 text-default">{formatAmount(n.total, n.currency)}</td>
                    <td className="p-3 text-muted capitalize">{n.reason}</td>
                    <td className="p-3">
                      <span className={STATUS_BADGE[n.status] || "badge-default"}>{n.status}</span>
                    </td>
                    <td className="p-3 text-xs text-muted">{new Date(n.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Link href={`/credit-notes/${n.id}`} className="text-xs text-accent-light hover:text-accent">View &rarr;</Link>
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatAmount } from "@/lib/currency";
import Link from "next/link";

type DebitNoteLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  hsnCode: string;
};

type DebitNoteDetail = {
  id: string;
  debitNoteNumber: string;
  supplierName: string;
  supplierGstin: string;
  currency: string;
  reason: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  status: string;
  date: string;
  invoice: { invoiceNumber: string; supplierName: string; total: number } | null;
  lines: DebitNoteLine[];
};

export default function DebitNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [note, setNote] = useState<DebitNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/debit-notes/${id}`)
      .then((r) => r.json())
      .then((data) => { setNote(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="p-6 text-sm text-slate-400">Loading…</main>;
  if (!note) return <main className="p-6 text-sm text-red-400">Debit note not found.</main>;

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Purchases</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{note.debitNoteNumber}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/debit-notes")}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/10">
              ← Back
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Debit Note Details</h2>

          <div className="mt-4 grid gap-4 rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Supplier</p>
              <p className="font-medium text-white">{note.supplierName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">GSTIN</p>
              <p className="font-mono text-sm text-white">{note.supplierGstin || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Date</p>
              <p className="font-medium text-white">{new Date(note.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Reason</p>
              <p className="font-medium text-white capitalize">{note.reason}</p>
            </div>
            {note.invoice && (
              <div>
                <p className="text-xs text-slate-400">Original Invoice</p>
                <Link href={`/invoices/${note.invoice}`} className="font-medium text-cyan-300 hover:text-cyan-200">
                  #{note.invoice.invoiceNumber}
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">HSN</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">GST</th>
                  <th className="p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {note.lines.map((line) => {
                  const lineTotal = line.quantity * line.unitPrice;
                  return (
                    <tr key={line.id} className="border-t border-white/10 bg-slate-900/50">
                      <td className="p-3 text-white">{line.description}</td>
                      <td className="p-3 font-mono text-xs text-slate-300">{line.hsnCode || "—"}</td>
                      <td className="p-3 text-slate-300">{line.quantity}</td>
                      <td className="p-3 text-slate-300">{formatAmount(line.unitPrice, note.currency)}</td>
                      <td className="p-3 text-slate-300">{line.taxRate}%</td>
                      <td className="p-3 font-medium text-white">{formatAmount(lineTotal, note.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1 rounded-xl bg-slate-900/80 p-3 text-right text-sm">
            <div className="text-slate-300">Subtotal: <span className="font-semibold text-white">{formatAmount(note.subtotal, note.currency)}</span></div>
            <div className="text-slate-300">Tax: <span className="font-semibold text-white">{formatAmount(note.taxTotal, note.currency)}</span></div>
            <div className="border-t border-white/10 pt-1 text-white">Total: <span className="font-semibold">{formatAmount(note.total, note.currency)}</span></div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Status</h2>
          <div className="mt-4 flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              note.status === "issued" ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-300"
            }`}>{note.status}</span>
          </div>
          <p className="mt-4 text-xs text-slate-500">Debit notes are created with "issued" status and automatically post reversing journal entries.</p>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatAmount } from "@/lib/currency";
import Link from "next/link";

type RecurringLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  hsnCode: string;
};

type RecurringDetail = {
  id: string;
  customerName: string;
  customerGstin: string;
  currency: string;
  frequency: string;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  lastRunAt: string | null;
  status: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: RecurringLine[];
  generatedInvoices: { id: string; invoiceNumber: string; total: number }[];
};

export default function RecurringInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [note, setNote] = useState<RecurringDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/recurring-invoices/${id}`)
      .then((r) => r.json())
      .then((data) => { setNote(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function changeStatus(newStatus: string) {
    const res = await fetch(`/api/recurring-invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setNote((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
  }

  if (loading) return <main className="p-6 text-sm text-slate-400">Loading…</main>;
  if (!note) return <main className="p-6 text-sm text-red-400">Recurring invoice not found.</main>;

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Automation</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{note.customerName}</h1>
            <p className="mt-1 text-sm text-slate-400 capitalize">Every {note.interval > 1 ? `${note.interval} ${note.frequency}s` : note.frequency}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/recurring-invoices")}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/10">
              ← Back
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Schedule Details</h2>

          <div className="mt-4 grid gap-4 rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Customer</p>
              <p className="font-medium text-white">{note.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">GSTIN</p>
              <p className="font-mono text-sm text-white">{note.customerGstin || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Next Run</p>
              <p className="font-medium text-white">{new Date(note.nextRunDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Last Run</p>
              <p className="font-medium text-white">{note.lastRunAt ? new Date(note.lastRunAt).toLocaleDateString() : "Never"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Start Date</p>
              <p className="font-medium text-white">{new Date(note.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">End Date</p>
              <p className="font-medium text-white">{note.endDate ? new Date(note.endDate).toLocaleDateString() : "Ongoing"}</p>
            </div>
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

          {note.generatedInvoices.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white">Generated Invoices</h3>
              <div className="mt-2 space-y-1">
                {note.generatedInvoices.map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm hover:bg-slate-800/50">
                    <span className="text-cyan-300">#{inv.invoiceNumber}</span>
                    <span className="text-slate-400">{formatAmount(inv.total, note.currency)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Status</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                note.status === "active" ? "bg-emerald-500/10 text-emerald-300" :
                note.status === "paused" ? "bg-amber-500/10 text-amber-300" :
                note.status === "completed" ? "bg-blue-500/10 text-blue-300" :
                "bg-red-500/10 text-red-300"
              }`}>{note.status}</span>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {note.status === "active" && (
                <button onClick={() => changeStatus("paused")}
                  className="rounded-full border border-amber-500/30 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/10">
                  Pause Schedule
                </button>
              )}
              {note.status === "paused" && (
                <button onClick={() => changeStatus("active")}
                  className="rounded-full border border-emerald-500/30 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10">
                  Resume Schedule
                </button>
              )}
              {note.status !== "cancelled" && (
                <button onClick={() => changeStatus("cancelled")}
                  className="rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
                  Cancel Schedule
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Reminder Settings</h2>
            <p className="mt-2 text-xs text-slate-500">
              Overdue payment reminders are configured in Settings. The cron job checks for due/overdue invoices daily.
            </p>
            <Link href="/settings"
              className="mt-4 inline-block text-sm text-cyan-300 hover:text-cyan-200">
              Go to Settings →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/currency";

type PaymentSummary = {
  id: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  invoice: { invoiceNumber: string; customerName: string } | null;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPayments() {
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data);
    setLoading(false);
  }

  useEffect(() => { fetchPayments(); }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Payments</h1>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
              {payments.filter((p) => p.status === "completed").length} completed
            </span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
              {payments.filter((p) => p.status === "pending").length} pending
            </span>
          </div>
        </div>
      </section>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">No payments recorded yet.</p>
            <p className="mt-1 text-xs text-slate-500">Payments are created when you mark an invoice as paid.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Invoice</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payments.map((pm) => (
                  <tr key={pm.id} className="border-t border-white/5 hover:bg-slate-950/50">
                    <td className="p-3 text-white">
                      {pm.invoice ? (
                        <Link href={`/invoices/${pm.invoiceId ?? ""}`} className="hover:text-cyan-300">
                          #{pm.invoice.invoiceNumber}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-slate-300">{pm.invoice?.customerName ?? "—"}</td>
                    <td className="p-3 font-semibold text-white">{formatAmount(pm.amount, pm.currency)}</td>
                    <td className="p-3 text-slate-300 capitalize">{pm.method}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        pm.status === "completed" ? "bg-emerald-500/10 text-emerald-300" :
                        pm.status === "failed" ? "bg-red-500/10 text-red-300" :
                        "bg-amber-500/10 text-amber-300"
                      }`}>
                        {pm.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-xs">
                      {pm.paidAt ? new Date(pm.paidAt).toLocaleDateString() : new Date(pm.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Link href={`/payments/${pm.id}`} className="text-xs text-cyan-300 hover:text-cyan-200">
                        View →
                      </Link>
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

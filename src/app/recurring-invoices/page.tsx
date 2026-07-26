"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/currency";

type RecurringSummary = {
  id: string;
  customerName: string;
  currency: string;
  frequency: string;
  interval: number;
  total: number;
  status: string;
  nextRunDate: string;
  lastRunAt: string | null;
};

export default function RecurringInvoicesPage() {
  const [items, setItems] = useState<RecurringSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const res = await fetch("/api/recurring-invoices");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Automation</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Recurring Invoices</h1>
            <p className="mt-1 text-sm text-slate-400">Automatically generate invoices on a schedule</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/recurring-invoices/new"
              className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              + New Schedule
            </Link>
          </div>
        </div>
      </section>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400">No recurring invoices yet.</p>
            <p className="mt-1 text-xs text-slate-500">Create a schedule to auto-generate invoices for repeat customers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Schedule</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Next Run</th>
                  <th className="p-3 font-medium">Last Run</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((ri) => (
                  <tr key={ri.id} className="border-t border-white/5 hover:bg-slate-950/50">
                    <td className="p-3 text-white">{ri.customerName}</td>
                    <td className="p-3 text-slate-300 capitalize">
                      Every {ri.interval > 1 ? `${ri.interval} ${ri.frequency}s` : ri.frequency}
                    </td>
                    <td className="p-3 text-white">{formatAmount(ri.total, ri.currency)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        ri.status === "active" ? "bg-emerald-500/10 text-emerald-300" :
                        ri.status === "paused" ? "bg-amber-500/10 text-amber-300" :
                        ri.status === "completed" ? "bg-blue-500/10 text-blue-300" :
                        "bg-red-500/10 text-red-300"
                      }`}>{ri.status}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {new Date(ri.nextRunDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {ri.lastRunAt ? new Date(ri.lastRunAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3">
                      <Link href={`/recurring-invoices/${ri.id}`} className="text-xs text-cyan-300 hover:text-cyan-200">View →</Link>
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

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

const STATUS_BADGE: Record<string, string> = {
  active: "badge-success", paused: "badge-warning",
  completed: "badge-info", cancelled: "badge-danger",
};

export default function RecurringInvoicesPage() {
  const [items, setItems] = useState<RecurringSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const res = await fetch("/api/recurring-invoices");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--doc-recurring)" }}>Automation</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Recurring Invoices</h1>
            <p className="mt-1 text-sm text-muted">Automatically generate invoices on a schedule</p>
          </div>
          <Link href="/recurring-invoices/new" className="btn-primary">+ New Schedule</Link>
        </div>
      </section>

      <div className="section-card overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No recurring invoices yet.</p>
            <p className="mt-1 text-xs text-muted">Create a schedule to auto-generate invoices for repeat customers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-default text-muted">
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
                  <tr key={ri.id} className="border-t border-default hover-brighten">
                    <td className="p-3 text-default">{ri.customerName}</td>
                    <td className="p-3 text-muted capitalize">
                      Every {ri.interval > 1 ? `${ri.interval} ${ri.frequency}s` : ri.frequency}
                    </td>
                    <td className="p-3 text-default">{formatAmount(ri.total, ri.currency)}</td>
                    <td className="p-3">
                      <span className={STATUS_BADGE[ri.status] || "badge-default"}>{ri.status}</span>
                    </td>
                    <td className="p-3 text-xs text-muted">
                      {new Date(ri.nextRunDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-xs text-muted">
                      {ri.lastRunAt ? new Date(ri.lastRunAt).toLocaleDateString() : "\u2014"}
                    </td>
                    <td className="p-3">
                      <Link href={`/recurring-invoices/${ri.id}`} className="text-xs text-accent-light hover:text-accent">View &rarr;</Link>
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

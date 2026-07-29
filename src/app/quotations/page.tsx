"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Order = { id: string; orderNumber: string; status: string; partyName: string; total: number; orderDate: string };

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-default", pending: "badge-warning", approved: "badge-info",
  delivered: "badge-success", completed: "badge-success", cancelled: "badge-danger",
};

export default function QuotationsListPage() {
  const { currentOrgCurrency } = useOrg();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders?type=quotation")
      .then((r) => r.json())
      .then((d) => { setOrders(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent-light">Trade Documents</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Quotations</h1>
          </div>
          <Link href="/quotations/new" className="btn-primary">+ New Quotation</Link>
        </div>
      </section>

      <div className="section-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-muted">No quotations yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-default text-muted">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Party</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium text-right">Total</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-default hover-brighten">
                    <td className="p-3 text-default font-mono">
                      <Link href={`/quotations/${o.id}`} className="hover:text-accent-light">{o.orderNumber}</Link>
                    </td>
                    <td className="p-3 text-muted">{o.partyName}</td>
                    <td className="p-3 text-xs text-muted">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right text-default font-medium">{formatAmount(o.total, currentOrgCurrency)}</td>
                    <td className="p-3">
                      <span className={STATUS_BADGE[o.status] || "badge-default"}>{o.status}</span>
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

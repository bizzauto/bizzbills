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

export default function DeliveryChallanListPage() {
  const { currentOrgCurrency } = useOrg();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders?type=delivery_challan")
      .then((r) => r.json())
      .then((d) => { setOrders(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--doc-challan)" }}>Trade Documents</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Delivery Challans</h1>
          </div>
          <Link href="/delivery-challan/new" className="btn-primary">+ New Challan</Link>
        </div>
      </section>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No delivery challans yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Party</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium text-right">Total</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white font-mono">
                      <Link href={`/delivery-challan/${o.id}`} className="hover:text-cyan-300">{o.orderNumber}</Link>
                    </td>
                    <td className="p-3 text-slate-300">{o.partyName}</td>
                    <td className="p-3 text-xs text-slate-500">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right text-white font-medium">{formatAmount(o.total, currentOrgCurrency)}</td>
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

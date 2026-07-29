"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

const orderTypes = [
  { key: "sales_order", label: "Sales Orders" },
  { key: "purchase_order", label: "Purchase Orders" },
  { key: "quotation", label: "Quotations" },
  { key: "delivery_challan", label: "Delivery Challans" },
];

type Order = { id: string; orderNumber: string; orderType: string; status: string; partyName: string; total: number; orderDate: string };

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-default", pending: "badge-warning", approved: "badge-info",
  delivered: "badge-success", completed: "badge-success", cancelled: "badge-danger",
};

export default function OrdersPage() {
  const { currentOrgCurrency } = useOrg();
  const [tab, setTab] = useState("sales_order");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch(`/api/orders?type=${tab}`).then((r) => r.json()).then(setOrders);
  }, [tab]);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--doc-order)" }}>Orders</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {orderTypes.find((t) => t.key === tab)?.label}
            </h1>
          </div>
          <Link href="/orders/new" className="btn-primary">+ New Order</Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {orderTypes.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              tab === t.key
                ? "bg-cyan-500 text-slate-950"
                : "border border-white/10 text-slate-300 hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No orders yet.</div>
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
                      <Link href={`/orders/${o.id}`} className="hover:text-cyan-300">{o.orderNumber}</Link>
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

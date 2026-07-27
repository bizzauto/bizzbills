"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Order = { id: string; orderNumber: string; status: string; partyName: string; total: number; orderDate: string };

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

  const statusColor: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-300", pending: "bg-amber-500/10 text-amber-300",
    approved: "bg-cyan-500/10 text-cyan-300", delivered: "bg-emerald-500/10 text-emerald-300",
    completed: "bg-emerald-500/10 text-emerald-300", cancelled: "bg-red-500/10 text-red-300",
  };

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Trade Documents</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Quotations</h1>
          </div>
          <Link href="/quotations/new" className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">+ New Quotation</Link>
        </div>
      </section>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No quotations yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-white/10 text-slate-400">
                <th className="p-3 font-medium">#</th><th className="p-3 font-medium">Party</th><th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium text-right">Total</th><th className="p-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white font-mono"><Link href={`/quotations/${o.id}`} className="hover:text-cyan-300">{o.orderNumber}</Link></td>
                    <td className="p-3 text-slate-300">{o.partyName}</td>
                    <td className="p-3 text-xs text-slate-500">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right text-white font-medium">{formatAmount(o.total, currentOrgCurrency)}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[o.status] || "bg-slate-500/10 text-slate-300"}`}>{o.status}</span></td>
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

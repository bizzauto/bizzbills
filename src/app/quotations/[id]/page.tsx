"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

const statusColor: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-300", pending: "bg-amber-500/10 text-amber-300",
  approved: "bg-cyan-500/10 text-cyan-300", delivered: "bg-emerald-500/10 text-emerald-300",
  completed: "bg-emerald-500/10 text-emerald-300", cancelled: "bg-red-500/10 text-red-300",
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrgCurrency } = useOrg();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => { fetch(`/api/orders/${params.id}`).then((r) => r.json()).then((d) => setOrder(Array.isArray(d) ? d[0] || d : d)); }, [params.id]);

  if (!order) return <main className="pb-10 text-sm text-slate-400">Loading…</main>;

  async function changeStatus(status: string) {
    await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOrder({ ...order, status });
  }

  return (
    <main className="mx-auto max-w-4xl pb-10">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.back()} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5">← Back</button>
        <h1 className="text-2xl font-semibold text-white">{order.orderNumber}</h1>
        <span className="rounded-full bg-cyan-500/10 px-3 py-0.5 text-[10px] font-medium text-cyan-300">Quotation</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[order.status]}`}>{order.status}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-sm text-slate-400 mb-1">Party</h2>
          <p className="text-lg font-semibold text-white">{order.partyName}</p>
          {order.partyGstin && <p className="text-xs text-slate-400 font-mono">{order.partyGstin}</p>}
          <p className="text-xs text-slate-500 mt-2">Date: {new Date(order.orderDate).toLocaleDateString()}</p>
          {order.deliveryDate && <p className="text-xs text-slate-500">Valid until: {new Date(order.deliveryDate).toLocaleDateString()}</p>}
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-sm text-slate-400 mb-2">Status</h2>
          <div className="flex flex-wrap gap-2">
            {["draft", "pending", "approved", "cancelled"].map((s) => (
              <button key={s} onClick={() => changeStatus(s)} disabled={s === order.status}
                className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${s === order.status ? `${statusColor[s]} ring-1 ring-white/20` : "border border-white/10 text-slate-400 hover:bg-white/10"}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-white/10 text-slate-400">
              <th className="p-3 font-medium">Description</th><th className="p-3 font-medium text-right">Qty</th>
              <th className="p-3 font-medium text-right">Rate</th><th className="p-3 font-medium text-right">Tax</th><th className="p-3 font-medium text-right">Amount</th>
            </tr></thead>
            <tbody>
              {order.lines?.map((l: any) => (
                <tr key={l.id} className="border-t border-white/5">
                  <td className="p-3 text-white">{l.description}</td>
                  <td className="p-3 text-right text-slate-300">{l.quantity}</td>
                  <td className="p-3 text-right text-slate-300">{formatAmount(l.unitPrice, currentOrgCurrency)}</td>
                  <td className="p-3 text-right text-slate-400">{l.taxRate}%</td>
                  <td className="p-3 text-right text-white font-medium">{formatAmount(l.quantity * l.unitPrice, currentOrgCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-1 pt-4 border-t border-white/10 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="text-white">{formatAmount(order.subtotal, currentOrgCurrency)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Tax</span><span className="text-white">{formatAmount(order.taxTotal, currentOrgCurrency)}</span></div>
          <div className="flex justify-between text-lg font-semibold"><span className="text-white">Total</span><span className="text-cyan-300">{formatAmount(order.total, currentOrgCurrency)}</span></div>
        </div>
      </div>

      {order.notes && (
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-sm font-semibold text-white mb-2">Notes / Terms</h2>
          <p className="text-sm text-slate-300">{order.notes}</p>
        </div>
      )}
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Payment = { id: string; invoice?: { invoiceNumber: string }; amount: number; method: string; status: string; paidAt: string; createdAt: string; gatewayRef?: string };

export default function PaymentsPage() {
  const { currentOrgCurrency } = useOrg();
  const [tab, setTab] = useState("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  useEffect(() => {
    fetch("/api/payments").then((r) => r.json()).then((d) => setPayments(Array.isArray(d) ? d : []));
    fetch("/api/outstanding").then((r) => r.json()).then((d) => { setOutstanding(d.outstanding ?? []); setTotalOutstanding(d.totalOutstanding ?? 0); });
  }, []);

  const filtered = tab === "all" ? payments : payments.filter((p) => p.status === tab);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Payments</h1>
          </div>
          <div className="flex gap-4">
            <div className="text-right"><p className="text-xs text-slate-400">Total Collected</p><p className="text-lg font-semibold text-emerald-300">{formatAmount(payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0), currentOrgCurrency)}</p></div>
            <div className="text-right"><p className="text-xs text-slate-400">Outstanding</p><p className="text-lg font-semibold text-amber-300">{formatAmount(totalOutstanding, currentOrgCurrency)}</p></div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {["all", "completed", "pending", "failed"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
              tab === t ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/5"
            }`}>{t}</button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
          {filtered.length === 0 ? <div className="p-6 text-sm text-slate-500">No payments.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-white/10 text-slate-400">
                  <th className="p-3 font-medium">Invoice</th><th className="p-3 font-medium">Method</th><th className="p-3 font-medium text-right">Amount</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Date</th>
                </tr></thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 font-mono text-xs text-white">#{p.invoice?.invoiceNumber || "—"}</td>
                      <td className="p-3 text-xs text-slate-300">{p.method}</td>
                      <td className="p-3 text-right text-white font-medium">{formatAmount(p.amount, currentOrgCurrency)}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        p.status === "completed" ? "bg-emerald-500/10 text-emerald-300" :
                        p.status === "pending" ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-300"
                      }`}>{p.status}</span></td>
                      <td className="p-3 text-xs text-slate-500">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <h2 className="text-sm font-semibold text-white mb-4">Outstanding Dues</h2>
          {outstanding.length === 0 ? <p className="text-xs text-slate-500">All invoices paid.</p> : (
            <div className="space-y-2">
              {outstanding.slice(0, 10).map((o) => (
                <div key={o.id} className="flex justify-between rounded-xl border border-white/5 bg-slate-950/50 p-2.5">
                  <div><p className="text-xs text-white">{o.customerName}</p><p className="text-[10px] text-slate-500">#{o.invoiceNumber}</p></div>
                  <div className="text-right"><p className="text-xs font-medium text-amber-300">{formatAmount(o.outstanding, currentOrgCurrency)}</p><p className="text-[10px] text-slate-500">Due: {o.dueDate}</p></div>
                </div>
              ))}
              {outstanding.length > 10 && <p className="text-xs text-slate-400 text-center">+{outstanding.length - 10} more</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

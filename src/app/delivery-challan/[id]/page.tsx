"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";
import { PrintableDocument, handlePrint } from "@/components/PrintableInvoice";
import type { TemplateId } from "@/components/invoice/InvoiceTemplates";

const statusColor: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-300", pending: "bg-amber-500/10 text-amber-300",
  approved: "bg-cyan-500/10 text-cyan-300", delivered: "bg-emerald-500/10 text-emerald-300",
  completed: "bg-emerald-500/10 text-emerald-300", cancelled: "bg-red-500/10 text-red-300",
};

export default function DeliveryChallanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrgCurrency } = useOrg();
  const [order, setOrder] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("bordered");
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`).then((r) => r.json()).then((d) => setOrder(d && !d.error ? d : null));
    fetch("/api/organization/settings").then((r) => r.json()).then((d) => {
      if (d && d.name) {
        setOrg(d);
        if (d.defaultTemplate) setSelectedTemplate(d.defaultTemplate);
      }
    }).catch(() => {});
  }, [params.id]);

  if (!order) return <main className="pb-10 text-sm text-slate-400">Loading…</main>;

  async function changeStatus(status: string) {
    await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOrder({ ...order, status });
  }

  const fmtDate = (v: any) => {
    if (!v) return undefined;
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN");
  };

  const docData = {
    number: order.orderNumber,
    title: "Delivery Challan",
    customerName: order.partyName,
    customerGstin: order.partyGstin || undefined,
    date: fmtDate(order.orderDate) || "",
    lines: (order.lines || []).map((l: any) => ({
      description: l.description,
      hsnCode: l.hsnCode || undefined,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate || 0,
    })),
    subtotal: order.subtotal,
    taxTotal: order.taxTotal,
    total: order.total,
    currency: order.currency || currentOrgCurrency,
    notes: order.notes || undefined,
    orgName: org?.name || "Your Company",
    orgAddress: org?.address,
    orgGstin: org?.gstin,
    orgEmail: org?.email,
    orgPhone: org?.phone,
    orgLogo: org?.logo,
    bankName: org?.bankName,
    bankAccount: org?.accountNumber,
    bankAccountName: org?.accountName,
    bankIfsc: org?.ifscCode,
    bankBranch: org?.bankBranch,
    upiId: org?.upiId,
    accentColor: org?.defaultAccentColor,
    showBankDetails: org?.showBankDetails,
    showQrCode: org?.showQrCode,
    showSignature: org?.showSignature,
    showGstin: org?.showGstin,
    showLogo: org?.showLogo,
    showHsnSummary: org?.showHsnSummary,
    showAmountInWords: org?.showAmountInWords,
    showShipTo: org?.showShipTo,
    showTerms: org?.showTerms,
  };

  return (
    <main className="mx-auto max-w-4xl pb-10">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.back()} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5">← Back</button>
        <h1 className="text-2xl font-semibold text-white">{order.orderNumber}</h1>
        <span className="rounded-full bg-cyan-500/10 px-3 py-0.5 text-[10px] font-medium text-cyan-300">Delivery Challan</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[order.status]}`}>{order.status}</span>
        <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as TemplateId)}
          className="rounded-full border border-white/10 bg-transparent px-3 py-1 text-xs text-slate-300 outline-none">
          <option value="bordered">Bordered GST</option>
          <option value="classic">Classic GST</option>
          <option value="modern">Modern</option>
          <option value="minimal">Minimal</option>
          <option value="premium">Premium</option>
          <option value="mybillbook">Super</option>
          <option value="best">Best (Tally)</option>
          <option value="corporate">Corporate</option>
          <option value="compact">Compact</option>
        </select>
        <button onClick={handlePrint} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5">🖨 Print</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-sm text-slate-400 mb-1">Party</h2>
          <p className="text-lg font-semibold text-white">{order.partyName}</p>
          {order.partyGstin && <p className="text-xs text-slate-400 font-mono">{order.partyGstin}</p>}
          <p className="text-xs text-slate-500 mt-2">Date: {new Date(order.orderDate).toLocaleDateString()}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-sm text-slate-400 mb-2">Status</h2>
          <div className="flex flex-wrap gap-2">
            {["draft", "pending", "approved", "delivered", "completed", "cancelled"].map((s) => (
              <button key={s} onClick={() => changeStatus(s)} disabled={s === order.status}
                className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${s === order.status ? `${statusColor[s]} ring-1 ring-white/20` : "border border-white/10 text-slate-400 hover:bg-white/10"}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Items</h2>
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
          <h2 className="text-sm font-semibold text-white mb-2">Notes</h2>
          <p className="text-sm text-slate-300">{order.notes}</p>
        </div>
      )}

      <PrintableDocument data={docData} templateId={selectedTemplate} />
    </main>
  );
}

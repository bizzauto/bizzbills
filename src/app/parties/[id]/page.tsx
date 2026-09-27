"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

export default function PartyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrgCurrency } = useOrg();
  const [party, setParty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [partyInvoices, setPartyInvoices] = useState<any[]>([]);
  const [partyPayments, setPartyPayments] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/parties/${params.id}`).then((r) => r.json()).then((d) => { setParty(d); setLoading(false); });
  }, [params.id]);

  // Party ↔ documents connection: invoices + payments for this party
  useEffect(() => {
    if (!party?.name) return;
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setPartyInvoices(Array.isArray(d) ? d.filter((inv: any) => inv.customerName === party.name).slice(0, 8) : []))
      .catch(() => {});
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => setPartyPayments(Array.isArray(d) ? d.filter((p: any) => p.invoice?.customerName === party.name).slice(0, 8) : []))
      .catch(() => {});
  }, [party?.name]);

  if (loading) return <main className="pb-10 text-sm text-slate-400">Loading…</main>;
  if (!party) return <main className="pb-10"><p className="text-slate-400">Party not found.</p></main>;

  return (
    <main className="mx-auto max-w-3xl pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5">← Back</button>
        <h1 className="text-2xl font-semibold text-white">{party.name}</h1>
        <span className={`rounded-full px-3 py-0.5 text-[10px] font-medium ${party.type === "customer" ? "bg-cyan-500/10 text-cyan-300" : party.type === "vendor" ? "bg-purple-500/10 text-purple-300" : "bg-slate-500/10 text-slate-300"}`}>{party.type}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${party.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{party.isActive ? "Active" : "Inactive"}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Contact</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">GSTIN</dt><dd className="text-white font-mono">{party.gstin || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd className="text-white">{party.email || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd className="text-white">{party.phone || "—"}</dd></div>
            <div className="flex justify-between pt-2 border-t border-white/10"><dt className="text-slate-400">Outstanding</dt><dd className={`font-medium ${party.outstandingBalance > 0 ? "text-amber-300" : "text-slate-300"}`}>{formatAmount(party.outstandingBalance, currentOrgCurrency)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Credit Limit</dt><dd className="text-white">{party.creditLimit > 0 ? formatAmount(party.creditLimit, currentOrgCurrency) : "—"}</dd></div>
          </dl>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Addresses</h2>
          {party.addresses?.length > 0 ? party.addresses.map((a: any) => (
            <div key={a.id} className="mb-3 rounded-xl border border-white/5 bg-slate-950/50 p-3 text-sm">
              <p className="text-xs text-cyan-300 font-medium capitalize mb-1">{a.type}</p>
              <p className="text-slate-300">{a.address}</p>
              <p className="text-slate-400 text-xs">{[a.city, a.state, a.pincode].filter(Boolean).join(", ")}</p>
            </div>
          )) : <p className="text-sm text-slate-500">No addresses.</p>}
        </div>
      </div>

      {party.notes && (
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-sm font-semibold text-white mb-2">Notes</h2>
          <p className="text-sm text-slate-300">{party.notes}</p>
        </div>
      )}

      {/* Party Ledger Statement Table */}
      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Party Ledger Statement</h2>
            <p className="text-xs text-slate-400">Complete transaction history and running balance</p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:border-white/20 hover:text-white"
          >
            🖨 Print Ledger
          </button>
        </div>

        {party.ledger && party.ledger.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Ref</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right">Credit</th>
                  <th className="p-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {party.ledger.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-950/40">
                    <td className="p-3 text-slate-400">{entry.dateStr}</td>
                    <td className="p-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        entry.type === "Invoice" ? "bg-cyan-500/10 text-cyan-300" :
                        entry.type === "Payment" ? "bg-emerald-500/10 text-emerald-300" :
                        entry.type === "Credit Note" ? "bg-purple-500/10 text-purple-300" :
                        "bg-amber-500/10 text-amber-300"
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-medium text-white">{entry.reference}</td>
                    <td className="p-3 text-slate-300">{entry.description}</td>
                    <td className="p-3 text-right font-medium text-slate-200">
                      {entry.debit > 0 ? formatAmount(entry.debit, currentOrgCurrency) : "—"}
                    </td>
                    <td className="p-3 text-right font-medium text-emerald-400">
                      {entry.credit > 0 ? formatAmount(entry.credit, currentOrgCurrency) : "—"}
                    </td>
                    <td className="p-3 text-right font-semibold text-white">
                      {formatAmount(entry.runningBalance, currentOrgCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No transactions recorded for this party yet.</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Invoices</h2>
            <Link href="/invoices" className="text-xs text-cyan-300 hover:text-cyan-200">View all →</Link>
          </div>
          {partyInvoices.length > 0 ? (
            <div className="space-y-2">
              {partyInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-sm">
                  <div>
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-white hover:text-cyan-300">#{inv.invoiceNumber}</Link>
                    <p className="text-xs text-slate-500">{inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN") : ""} · {inv.status}</p>
                  </div>
                  <span className="font-medium text-white">{formatAmount(inv.total, currentOrgCurrency)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No invoices for this party yet.</p>}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Payments</h2>
            <Link href="/payments" className="text-xs text-cyan-300 hover:text-cyan-200">View all →</Link>
          </div>
          {partyPayments.length > 0 ? (
            <div className="space-y-2">
              {partyPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-sm">
                  <div>
                    <Link href={`/payments/${p.id}`} className="font-medium text-white hover:text-cyan-300">{formatAmount(p.amount, currentOrgCurrency)}</Link>
                    <p className="text-xs text-slate-500">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : ""} · {p.invoice ? `#${p.invoice.invoiceNumber}` : p.method} · {p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No payments from this party yet.</p>}
        </div>
      </div>
    </main>
  );
}

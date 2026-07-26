"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

export default function PartyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrgCurrency } = useOrg();
  const [party, setParty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/parties/${params.id}`).then((r) => r.json()).then((d) => { setParty(d); setLoading(false); });
  }, [params.id]);

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
    </main>
  );
}

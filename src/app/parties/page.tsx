"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Party = { id: string; name: string; type: string; email: string; phone: string; gstin: string; outstandingBalance: number; creditLimit: number; isActive: boolean };

export default function PartiesPage() {
  const { currentOrgCurrency } = useOrg();
  const [tab, setTab] = useState("customer");
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ type: tab });
    if (search) params.set("search", search);
    fetch(`/api/parties?${params}`).then((r) => r.json()).then((d) => setParties(Array.isArray(d) ? d : []));
  }, [tab, search]);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">CRM</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Parties</h1>
          </div>
          <Link href="/parties/new" className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">+ Add Party</Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 items-center">
        {["customer", "vendor", "other"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
              tab === t ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/5"
            }`}>{t}s</button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parties…" className="ml-auto rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50 w-48" />
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {parties.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No {tab}s yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-white/10 text-slate-400">
                <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">GSTIN</th><th className="p-3 font-medium">Phone</th><th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium text-right">Outstanding</th><th className="p-3 font-medium text-right">Credit Limit</th><th className="p-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {parties.map((p) => (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white"><Link href={`/parties/${p.id}`} className="hover:text-cyan-300">{p.name}</Link></td>
                    <td className="p-3 font-mono text-xs text-slate-400">{p.gstin || "—"}</td>
                    <td className="p-3 text-slate-300">{p.phone || "—"}</td>
                    <td className="p-3 text-slate-300">{p.email || "—"}</td>
                    <td className={`p-3 text-right font-medium ${p.outstandingBalance > 0 ? "text-amber-300" : "text-slate-300"}`}>{formatAmount(p.outstandingBalance, currentOrgCurrency)}</td>
                    <td className="p-3 text-right text-slate-300">{p.creditLimit > 0 ? formatAmount(p.creditLimit, currentOrgCurrency) : "—"}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{p.isActive ? "Active" : "Inactive"}</span></td>
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

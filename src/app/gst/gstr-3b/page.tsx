"use client";

import { useState, useEffect } from "react";

interface Gstr3bData {
  period: { from: string; to: string };
  outwardSupplies: {
    totalTaxable: number;
    totalGst: number;
    interState: { taxable: number; gst: number };
    intraState: { taxable: number; gst: number };
    nilRated: number;
    exempt: number;
  };
  inputTaxCredit: { totalItc: number };
  netTaxPayable: number;
}

export default function Gstr3bPage() {
  const [data, setData] = useState<Gstr3bData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gst/gstr-3b")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-400">Loading GSTR-3B report...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-400">Failed to load report</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">GSTR-3B — Monthly Summary</h1>
        <p className="mt-1 text-sm text-slate-400">GST return summary for the current month</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Outward Supplies</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">Total Taxable</span><span className="font-semibold text-white">₹{data.outwardSupplies.totalTaxable.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Total GST</span><span className="font-semibold text-white">₹{data.outwardSupplies.totalGst.toLocaleString()}</span></div>
            <hr className="border-white/10" />
            <div className="flex justify-between"><span className="text-slate-300">Inter-State Taxable</span><span className="text-white">₹{data.outwardSupplies.interState.taxable.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Inter-State GST</span><span className="text-white">₹{data.outwardSupplies.interState.gst.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Intra-State Taxable</span><span className="text-white">₹{data.outwardSupplies.intraState.taxable.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Intra-State GST</span><span className="text-white">₹{data.outwardSupplies.intraState.gst.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Nil Rated</span><span className="text-white">₹{data.outwardSupplies.nilRated.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Exempt</span><span className="text-white">₹{data.outwardSupplies.exempt.toLocaleString()}</span></div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Input Tax Credit</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">Total ITC</span><span className="font-semibold text-white">₹{data.inputTaxCredit.totalItc.toLocaleString()}</span></div>
          </div>
          <hr className="my-4 border-white/10" />
          <div className="rounded-xl bg-cyan-500/10 p-4">
            <p className="text-sm text-slate-400">Net Tax Payable</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-300">₹{data.netTaxPayable.toLocaleString()}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
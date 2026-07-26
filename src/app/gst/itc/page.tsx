"use client";

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/currency";

interface ItcData {
  period: string;
  totalItc: number;
  byRate: Record<string, { taxableAmount: number; gstAmount: number; count: number }>;
  eligibleInvoices: number;
}

export default function ItcPage() {
  const [data, setData] = useState<ItcData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gst/itc")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-400">Loading ITC report...</p>
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
        <h1 className="text-2xl font-semibold text-white">Input Tax Credit (ITC)</h1>
        <p className="mt-1 text-sm text-slate-400">Track input tax credit from inward supplies for GST reclaim</p>
        <p className="mt-1 text-xs text-slate-500">Period: {data.period} | Eligible Invoices: {data.eligibleInvoices}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <p className="text-sm text-slate-400">Total ITC Claimable</p>
          <p className="mt-1 text-3xl font-semibold text-cyan-300">{formatAmount(data.totalItc, "INR")}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <p className="text-sm text-slate-400">Invoices with ITC</p>
          <p className="mt-1 text-3xl font-semibold text-white">{data.eligibleInvoices}</p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <h2 className="text-lg font-semibold text-white">ITC by GST Rate</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/80 text-left text-slate-300">
              <tr>
                <th className="p-3">GST Rate</th>
                <th className="p-3">Invoices</th>
                <th className="p-3">Taxable Amount</th>
                <th className="p-3">ITC Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byRate).map(([rate, info]) => (
                <tr key={rate} className="border-t border-white/10 bg-slate-900/50">
                  <td className="p-3 font-semibold text-white">{rate}</td>
                  <td className="p-3 text-slate-300">{info.count}</td>
                  <td className="p-3 text-white">{formatAmount(info.taxableAmount, "INR")}</td>
                  <td className="p-3 text-emerald-300">{formatAmount(info.gstAmount, "INR")}</td>
                </tr>
              ))}
              {Object.keys(data.byRate).length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">No ITC available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
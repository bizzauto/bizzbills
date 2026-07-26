"use client";

import { useEffect, useState } from "react";
import { formatAmount, getCommonCurrencies } from "@/lib/currency";

type ExchangeRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  date: string;
  updatedAt: string;
};

export default function CurrencyPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newRate, setNewRate] = useState({ toCurrency: "USD", rate: 0 });

  async function fetchRates() {
    setLoading(true);
    const res = await fetch(`/api/currency/rates?base=${baseCurrency}`);
    const data = await res.json();
    setRates(data.rates ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchRates(); }, [baseCurrency]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/currency/rates", { method: "PUT" });
    await fetchRates();
    setSyncing(false);
  }

  async function handleAdd() {
    await fetch("/api/currency/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromCurrency: baseCurrency, toCurrency: newRate.toCurrency, rate: newRate.rate }),
    });
    setShowAdd(false);
    setNewRate({ toCurrency: "USD", rate: 0 });
    await fetchRates();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/currency/rates?id=${id}`, { method: "DELETE" });
    await fetchRates();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Currency & Exchange Rates</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync live rates"}
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              {showAdd ? "Cancel" : "Add manual rate"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Base Currency</h2>
          <p className="mt-1 text-xs text-slate-400">Rates are stored relative to your base currency.</p>
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none"
          >
            {getCommonCurrencies().map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>

          {showAdd && (
            <div className="mt-4 space-y-3">
              <hr className="border-white/10" />
              <p className="text-sm font-medium text-white">Add Manual Rate</p>
              <select
                value={newRate.toCurrency}
                onChange={(e) => setNewRate({ ...newRate, toCurrency: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                {getCommonCurrencies().filter((c) => c.code !== baseCurrency).map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.0001"
                placeholder="Rate"
                value={newRate.rate || ""}
                onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />
              <button
                onClick={handleAdd}
                disabled={!newRate.rate}
                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Exchange Rates</h2>
            <span className="text-xs text-slate-500">{rates.length} rates</span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : rates.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No rates yet. Sync live rates or add manually.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {rates.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div>
                    <span className="font-mono text-sm text-white">
                      1 {r.fromCurrency} = <span className="text-cyan-300">{r.rate}</span> {r.toCurrency}
                    </span>
                    <div className="flex gap-2 mt-1">
                      <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-slate-400">{r.source}</span>
                      <span className="text-[10px] text-slate-500">{new Date(r.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded-full border border-red-400/20 px-2.5 py-1 text-[10px] text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rates.length > 0 && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Quick Conversion</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rates.slice(0, 12).map((r) => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm">
                <span className="text-slate-400">1 {r.fromCurrency} =</span>
                <span className="ml-1 font-mono text-cyan-300">{formatAmount(r.rate, r.toCurrency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

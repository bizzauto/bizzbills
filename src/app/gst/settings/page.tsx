"use client";

import { useState, useEffect } from "react";

interface GstSettingsData {
  org: { id: string; name: string; gstin: string; currency: string };
  gstRates: { id: string; name: string; rate: number; type: string; state: string | null; isActive: boolean }[];
  settings: { ewbEnabled: boolean; ewbThreshold: number };
}

export default function GstSettingsPage() {
  const [data, setData] = useState<GstSettingsData | null>(null);
  const [gstin, setGstin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/gst/settings")
      .then((r) => r.json())
      .then((d) => setData(d && typeof d === "object" ? d : null));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/gst/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-400">Loading GST settings...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">GST Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Configure your organization GST details and compliance settings</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Organization GST</h2>
          <div className="mt-4 space-y-4">
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Organization</span>
              <p className="text-white">{data.org.name}</p>
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">GSTIN</span>
              <input
                value={gstin || data.org.gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AABCU9603R1ZX"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500"
              />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Currency</span>
              <p className="text-white">{data.org.currency}</p>
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save GSTIN"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">E-Way Bill</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" checked={data.settings.ewbEnabled} disabled className="rounded" />
              Enable E-Way Bill generation
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Threshold (₹)</span>
              <p className="text-white">₹{data.settings.ewbThreshold.toLocaleString()}</p>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <h2 className="text-lg font-semibold text-white">Configured GST Rates</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/80 text-left text-slate-300">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Rate</th>
                <th className="p-3">State</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.gstRates.map((rate) => (
                <tr key={rate.id} className="border-t border-white/10 bg-slate-900/50">
                  <td className="p-3 text-white">{rate.name}</td>
                  <td className="p-3 text-slate-300">{rate.type}</td>
                  <td className="p-3 text-white">{rate.rate}%</td>
                  <td className="p-3 text-slate-300">{rate.state ?? "All"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${rate.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>
                      {rate.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {data.gstRates.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No GST rates configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
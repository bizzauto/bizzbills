"use client";

import { useState, useEffect } from "react";

interface HsnSacCode {
  id: string;
  code: string;
  description: string;
  type: string;
  taxRate: number;
  chapter: string | null;
  heading: string | null;
  subheading: string | null;
  isActive: boolean;
}

export default function HsnPage() {
  const [codes, setCodes] = useState<HsnSacCode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", type: "hsn", taxRate: 18, chapter: "", heading: "", subheading: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/gst/hsn")
      .then((r) => r.json())
      .then(setCodes);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/gst/hsn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxRate: Number(form.taxRate),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const newCode = await res.json();
      setCodes([...codes, newCode]);
      setShowForm(false);
      setForm({ code: "", description: "", type: "hsn", taxRate: 18, chapter: "", heading: "", subheading: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this HSN/SAC code?")) return;
    await fetch(`/api/gst/hsn/${id}`, { method: "DELETE" });
    setCodes(codes.filter((c) => c.id !== id));
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">HSN / SAC Codes</h1>
          <p className="mt-1 text-sm text-slate-400">Manage GST classification codes for your products and services</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          + Add Code
        </button>
      </section>

      {showForm && (
        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">New HSN / SAC Code</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Code</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="998313" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Description</span>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Software services" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0">
                <option value="hsn">HSN (Goods)</option>
                <option value="sac">SAC (Services)</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Tax Rate (%)</span>
              <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Chapter</span>
              <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="e.g. Chapter 99" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Heading</span>
              <input value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} placeholder="e.g. 9983" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save Code"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/80 text-left text-slate-300">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Description</th>
                <th className="p-3">Type</th>
                <th className="p-3">Rate</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code.id} className="border-t border-white/10 bg-slate-900/50">
                  <td className="p-3 font-mono text-white">{code.code}</td>
                  <td className="p-3 text-slate-200">{code.description}</td>
                  <td className="p-3 text-slate-400 uppercase">{code.type}</td>
                  <td className="p-3 text-white">{code.taxRate}%</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${code.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>
                      {code.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(code.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No HSN/SAC codes yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWarehousePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push("/inventory/warehouses");
      else alert("Failed to create warehouse");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl pb-10">
      <h1 className="text-2xl font-semibold text-white mb-6">New Warehouse</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <label className="text-xs text-slate-400">Name *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        <label className="text-xs text-slate-400">Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{saving ? "Saving…" : "Save Warehouse"}</button>
          <button type="button" onClick={() => router.back()} className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
        </div>
      </form>
    </main>
  );
}

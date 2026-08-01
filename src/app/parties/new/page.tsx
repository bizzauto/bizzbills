"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GstinAutoFill } from "@/components/GstinAutoFill";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
  "Andaman & Nicobar", "Dadra & Nagar Haveli", "Daman & Diu", "Lakshadweep",
];

export default function NewPartyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "customer", name: "", gstin: "", email: "", phone: "",
    creditLimit: "0", notes: "",
    address: "", city: "", state: "", pincode: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type, name: form.name, gstin: form.gstin, email: form.email, phone: form.phone,
        creditLimit: parseFloat(form.creditLimit) || 0, notes: form.notes,
      };
      if (form.address) body.addresses = [{ address: form.address, city: form.city, state: form.state, pincode: form.pincode }];
      const res = await fetch("/api/parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) router.push("/parties");
      else alert("Failed to create party");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl pb-10">
      <h1 className="text-2xl font-semibold text-white mb-6">New Party</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <label className="text-xs text-slate-400">Type<select value={form.type} onChange={set("type")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50">
          <option value="customer">Customer</option><option value="vendor">Vendor</option><option value="other">Other</option>
        </select></label>

        {/* GSTIN Auto-Fill Section */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <p className="text-xs font-medium text-cyan-300 mb-2">🔍 Quick Fill via GSTIN</p>
          <p className="text-[10px] text-slate-400 mb-3">Enter GSTIN to auto-detect state and party type</p>
          <label className="text-xs text-slate-400">
            GSTIN
            <GstinAutoFill
              value={form.gstin}
              onChange={(gstin) => setForm((prev) => ({ ...prev, gstin }))}
              onStateDetected={(state) => setForm((prev) => ({ ...prev, state }))}
              className="mt-1"
            />
          </label>
        </div>

        <label className="text-xs text-slate-400">Name *<input required value={form.name} onChange={set("name")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">Email<input type="email" value={form.email} onChange={set("email")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
          <label className="text-xs text-slate-400">Phone<input value={form.phone} onChange={set("phone")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        </div>
        <label className="text-xs text-slate-400">Credit Limit<input type="number" step="0.01" value={form.creditLimit} onChange={set("creditLimit")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        <fieldset className="border-t border-white/10 pt-4">
          <legend className="text-xs font-medium text-cyan-300 mb-3">Address</legend>
          <div className="space-y-3">
            <label className="text-xs text-slate-400">Address<input value={form.address} onChange={set("address")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-xs text-slate-400">City<input value={form.city} onChange={set("city")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
              <label className="text-xs text-slate-400">State<select value={form.state} onChange={set("state")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50">
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
              <label className="text-xs text-slate-400">Pincode<input value={form.pincode} onChange={set("pincode")} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
            </div>
          </div>
        </fieldset>
        <label className="text-xs text-slate-400">Notes<textarea value={form.notes} onChange={set("notes")} rows={2} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50" /></label>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{saving ? "Saving…" : "Save Party"}</button>
          <button type="button" onClick={() => router.back()} className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
        </div>
      </form>
    </main>
  );
}

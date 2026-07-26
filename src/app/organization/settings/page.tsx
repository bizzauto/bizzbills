"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function OrganizationSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [orgName, setOrgName] = useState("");
  const [orgGstin, setOrgGstin] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgCurrency, setOrgCurrency] = useState("INR");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName,
          gstin: orgGstin,
          address: orgAddress,
          phone: orgPhone,
          email: orgEmail,
          currency: orgCurrency,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update settings");
      }

      setMessage("Settings saved successfully");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section>
        <h1 className="text-2xl font-semibold text-white">Organization Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your organization profile and preferences.</p>
      </section>

      {message && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <label className="block text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">Organization Name</span>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Your company name"
            required
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
          />
        </label>

        <label className="block text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">GSTIN</span>
          <input
            type="text"
            value={orgGstin}
            onChange={(e) => setOrgGstin(e.target.value.toUpperCase())}
            placeholder="22AABCU9603R1ZL"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
          />
        </label>

        <label className="block text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">Address</span>
          <textarea
            value={orgAddress}
            onChange={(e) => setOrgAddress(e.target.value)}
            placeholder="Street, City, State, PIN"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Phone</span>
            <input
              type="tel"
              value={orgPhone}
              onChange={(e) => setOrgPhone(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
            />
          </label>
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Email</span>
            <input
              type="email"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              placeholder="info@company.com"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
            />
          </label>
        </div>

        <label className="block text-sm text-slate-300">
          <span className="mb-1 block text-slate-400">Currency</span>
          <select
            value={orgCurrency}
            onChange={(e) => setOrgCurrency(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 focus:border-cyan-500/50"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="SGD">SGD (S$)</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>

      <div className="flex gap-3">
        <Link href="/organization/users" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
          Manage Users
        </Link>
        <Link href="/settings" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
          AI Settings
        </Link>
      </div>
    </main>
  );
}
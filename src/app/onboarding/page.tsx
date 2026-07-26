"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgCurrency, setOrgCurrency] = useState("INR");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgGstin, setOrgGstin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    checkOrgSetup();
  }, [status, router]);

  async function checkOrgSetup() {
    try {
      const res = await fetch("/api/organization/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }
    } catch {
      // No org yet, proceed with onboarding
    }
    setLoading(false);
  }

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
          slug: orgSlug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          currency: orgCurrency,
          address: orgAddress,
          gstin: orgGstin,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Setup failed");
      }

      setMessage("Organization setup complete!");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSaving(false);
    }
  }

  function generateSlug() {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setOrgSlug(slug);
  }

  if (loading || status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center pb-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
            Step {step} of 2
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Set up your organization
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Let&apos;s get your business workspace ready.
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Organization Name *</span>
              <input
                type="text"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (!orgSlug) generateSlug();
                }}
                onBlur={generateSlug}
                placeholder="Acme Corp"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </label>

            <label className="mt-4 block text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">URL Slug</span>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="acme-corp"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </label>

            <label className="mt-4 block text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Currency</span>
              <select
                value={orgCurrency}
                onChange={(e) => setOrgCurrency(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 focus:border-cyan-500/50"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
                <option value="SGD">SGD (S$) - Singapore Dollar</option>
              </select>
            </label>

            <label className="mt-4 block text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Address</span>
              <textarea
                value={orgAddress}
                onChange={(e) => setOrgAddress(e.target.value)}
                placeholder="Street, City, State, PIN Code"
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </label>

            <label className="mt-4 block text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">GSTIN (Optional)</span>
              <input
                type="text"
                value={orgGstin}
                onChange={(e) => setOrgGstin(e.target.value.toUpperCase())}
                placeholder="22AABCU9603R1ZL"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || !orgName.trim()}
            className="w-full rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {saving ? "Setting up…" : "Complete Setup"}
          </button>

          <p className="text-center text-xs text-slate-500">
            You can update these details anytime in{" "}
            <Link href="/organization/settings" className="text-cyan-400 hover:text-cyan-300">
              Organization Settings
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
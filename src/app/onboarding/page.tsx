"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const businessTypes = [
  { value: "retail", label: "Retail Shop" },
  { value: "wholesale", label: "Wholesale / Distribution" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "service", label: "Service Provider" },
  { value: "restaurant", label: "Restaurant / Hotel" },
  { value: "transport", label: "Transport / Logistics" },
  { value: "freelancer", label: "Freelancer / Professional" },
  { value: "other", label: "Other" },
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");

  // Step 1: Business Info
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("service");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2: Address & Tax
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");

  // Step 3: Bank & Payment
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/signin"); return; }
    checkOrgSetup();
  }, [status, router]);

  async function checkOrgSetup() {
    try {
      const res = await fetch("/api/organization/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.name && data.onboardingCompleted) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
        // Pre-fill if partial data exists
        if (data.name) setCompanyName(data.name);
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.gstin) setGstin(data.gstin);
        if (data.currency) setCurrency(data.currency);
        if (data.upiId) setUpiId(data.upiId);
      }
    } catch {}
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
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          businessType,
          phone,
          email,
          website,
          currency,
          address: `${address}, ${city}, ${state} - ${pincode}`.trim().replace(/^, |, $/g, ""),
          gstin,
          pan,
          upiId,
          bankName,
          accountName,
          accountNumber,
          ifscCode,
          onboardingCompleted: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Setup failed");
      }

      setMessage("✅ Business setup complete! Redirecting to dashboard...");
      setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Setup failed");
    } finally { setSaving(false); }
  }

  if (loading || status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </main>
    );
  }

  const steps = ["Business Info", "Address & Tax", "Bank & Payment"];
  const totalSteps = steps.length;

  return (
    <main className="flex flex-1 items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  i + 1 <= step ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-500"
                }`}>{i + 1}</div>
                <span className={`text-xs hidden sm:inline ${i + 1 <= step ? "text-cyan-300" : "text-slate-500"}`}>{s}</span>
                {i < totalSteps - 1 && <div className={`h-px w-6 transition ${i + 1 < step ? "bg-cyan-500" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
          <h1 className="text-2xl font-semibold text-white">Set Up Your Business</h1>
          <p className="mt-1 text-sm text-slate-400">Step {step} of {totalSteps} — {steps[step - 1]}</p>
        </div>

        {message && (
          <div className={`mb-4 rounded-xl border p-3 text-sm ${
            message.startsWith("✅") ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
          }`}>{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur space-y-4">
              <h2 className="text-lg font-semibold text-white">Company Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300 md:col-span-2">
                  <span className="mb-1 block text-slate-400">Company / Business Name *</span>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Acme Corp Pvt. Ltd." className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Business Type</span>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50">
                    {businessTypes.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Currency</span>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500/50">
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Phone Number *</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91 98765 43210" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Email (Display)</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@acmecorp.com" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Website</span>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acmecorp.com" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Address & Tax */}
          {step === 2 && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur space-y-4">
              <h2 className="text-lg font-semibold text-white">Address & Tax Details</h2>
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">Address *</span>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Street, Building, Area" rows={2} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">City *</span>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Mumbai" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">State</span>
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">PIN Code</span>
                  <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="400001" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">GSTIN (Optional)</span>
                  <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="22AABCU9603R1ZL" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">PAN (Optional)</span>
                  <input type="text" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="AABCD1234E" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Bank & Payment */}
          {step === 3 && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur space-y-4">
              <h2 className="text-lg font-semibold text-white">Bank & Payment Details</h2>
              <p className="text-xs text-slate-400">These details will appear on your invoices for payment.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Bank Name</span>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="State Bank of India" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Account Holder Name</span>
                  <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Acme Corp" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Account Number</span>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="XXXXXXXXXXX" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">IFSC Code</span>
                  <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} placeholder="SBIN0001234" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
              </div>
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">UPI ID (for QR code on invoice)</span>
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="acmecorp@upi" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
                <p className="mt-1 text-[10px] text-slate-500">This will generate a QR code on invoices for easy UPI payments.</p>
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 transition">
                ← Back
              </button>
            )}
            {step < totalSteps ? (
              <button type="button" onClick={() => setStep(step + 1)} disabled={!companyName.trim()} className="flex-1 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition disabled:opacity-50">
                Next →
              </button>
            ) : (
              <button type="submit" disabled={saving || !companyName.trim() || !phone.trim()} className="flex-1 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition disabled:opacity-50">
                {saving ? "Saving…" : "Complete Setup ✓"}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-slate-500">
            You can update these anytime in{" "}
            <Link href="/organization/settings" className="text-cyan-400 hover:text-cyan-300">Organization Settings</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

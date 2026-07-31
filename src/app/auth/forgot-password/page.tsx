"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicLayout } from "@/components/PublicLayout";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"email" | "phone">("email");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <main className="flex flex-1 items-center justify-center py-20">
        <div className="w-full max-w-md rounded-[2rem] section-card p-8 shadow-2xl shadow-black/20">
          <div className="mb-6 text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">Reset password</p>
            <h1 className="mt-2 text-2xl font-semibold text-default">Forgot your password?</h1>
            <p className="mt-2 text-sm text-muted">Enter your email or phone number and we&apos;ll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="text-center py-6">
              <span className="text-4xl">📧</span>
              <p className="mt-4 text-sm text-muted">
                If an account exists with <span className="font-medium text-default">{identifier}</span>, you&apos;ll receive a password reset link shortly.
              </p>
              <p className="mt-2 text-xs text-muted">
                Check your inbox (or SMS) for the reset link. The link expires in 1 hour.
              </p>
              <Link href="/auth/signin" className="mt-6 inline-block text-sm text-accent-light hover:text-accent">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {/* Email / Phone toggle */}
              <div className="mb-4 flex rounded-full border border-[var(--card-border)] bg-[var(--badge-bg)] p-1">
                <button
                  type="button"
                  onClick={() => { setMode("email"); setIdentifier(""); }}
                  className={`flex-1 rounded-full py-1.5 text-sm font-medium transition ${
                    mode === "email" ? "bg-accent text-slate-900" : "text-muted hover:text-default"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("phone"); setIdentifier(""); }}
                  className={`flex-1 rounded-full py-1.5 text-sm font-medium transition ${
                    mode === "phone" ? "bg-accent text-slate-900" : "text-muted hover:text-default"
                  }`}
                >
                  Phone
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm text-muted">
                  <span className="mb-1 block text-muted">
                    {mode === "email" ? "Email address" : "Phone number"}
                  </span>
                  <input
                    type={mode === "email" ? "email" : "tel"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={mode === "email" ? "you@example.com" : "+91 98765 43210"}
                    required
                    className="input"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>

                <p className="text-center text-sm text-muted">
                  Remember your password?{" "}
                  <Link href="/auth/signin" className="font-medium text-accent-light hover:text-accent">Sign in</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </PublicLayout>
  );
}

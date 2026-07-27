"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicLayout } from "@/components/PublicLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="mb-6 text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Reset password</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Forgot your password?</h1>
            <p className="mt-2 text-sm text-slate-400">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="text-center py-6">
              <span className="text-4xl">📧</span>
              <p className="mt-4 text-sm text-slate-300">
                If an account exists with <span className="font-medium text-white">{email}</span>, you&apos;ll receive a password reset link shortly.
              </p>
              <Link href="/auth/signin" className="mt-6 inline-block text-sm text-cyan-400 hover:text-cyan-300">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>

              <p className="text-center text-sm text-slate-400">
                Remember your password?{" "}
                <Link href="/auth/signin" className="font-medium text-cyan-300 hover:text-cyan-200">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </PublicLayout>
  );
}

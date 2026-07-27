"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PublicLayout } from "@/components/PublicLayout";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reset failed");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-6 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">New password</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Reset your password</h1>
      </div>

      {success ? (
        <div className="text-center py-6">
          <span className="text-4xl">✅</span>
          <p className="mt-4 text-sm text-slate-300">Password reset successful!</p>
          <Link href="/auth/signin" className="mt-6 inline-block text-sm text-cyan-400 hover:text-cyan-300">
            Sign in with new password →
          </Link>
        </div>
      ) : !token ? (
        <div className="text-center py-6">
          <p className="text-sm text-red-300">Invalid or missing reset token.</p>
          <Link href="/auth/forgot-password" className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300">
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">New Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters" required minLength={8}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
          </label>
          <label className="block text-sm text-slate-300">
            <span className="mb-1 block text-slate-400">Confirm Password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password" required minLength={8}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50" />
          </label>

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <PublicLayout>
      <main className="flex flex-1 items-center justify-center py-20">
        <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </PublicLayout>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicLayout } from "@/components/PublicLayout";

export default function SignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: identifier,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials. Please check and try again.");
      setLoading(false);
    } else {
      // Hard navigation to ensure proxy middleware picks up the new session
      window.location.href = "/dashboard";
    }
  }

  return (
    <PublicLayout>
    <main className="flex flex-1 items-center justify-center py-20">
      <div className="w-full max-w-md rounded-[2rem] section-card p-8 shadow-2xl shadow-black/20">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-accent-light">Welcome back</p>
          <h1 className="mt-2 text-2xl font-semibold text-default">Sign in to BizzBills</h1>
        </div>

        {/* Email / Phone toggle */}
        <div className="mb-4 flex rounded-full border border-[var(--card-border)] bg-[var(--badge-bg)] p-1">
          <button
            type="button"
            onClick={() => { setMode("email"); setIdentifier(""); setError(""); }}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition ${
              mode === "email"
                ? "bg-accent text-slate-900"
                : "text-muted hover:text-default"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => { setMode("phone"); setIdentifier(""); setError(""); }}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition ${
              mode === "phone"
                ? "bg-accent text-slate-900"
                : "text-muted hover:text-default"
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

          <label className="block text-sm text-muted">
            <span className="mb-1 block text-muted">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted transition hover:text-default"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/auth/forgot-password" className="text-sm text-accent-light hover:text-accent">
            Forgot password?
          </Link>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-medium text-accent-light hover:text-accent">
            Create one
          </Link>
        </p>
      </div>
    </main>
    </PublicLayout>
  );
}

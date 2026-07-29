"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicLayout } from "@/components/PublicLayout";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/onboarding");
      router.refresh();
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-muted">
            <span className="mb-1 block text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
            />
          </label>

          <label className="block text-sm text-muted">
            <span className="mb-1 block text-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
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

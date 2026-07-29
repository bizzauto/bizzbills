"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { PublicLayout } from "@/components/PublicLayout";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

await signIn("credentials", { email, password, redirect: false });
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
    <main className="flex flex-1 items-center justify-center py-20">
      <div className="w-full max-w-md rounded-[2rem] section-card p-8 shadow-2xl shadow-black/20">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-accent-light">Get started</p>
          <h1 className="mt-2 text-2xl font-semibold text-default">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-muted">
            <span className="mb-1 block text-muted">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="input"
            />
          </label>

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
              placeholder="At least 8 characters"
              required
              minLength={8}
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-medium text-accent-light hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </main>
    </PublicLayout>
  );
}

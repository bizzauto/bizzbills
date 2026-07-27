"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export function Navbar() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b l-border bg-l-nav backdrop-blur-xl" style={{ borderColor: "var(--card-border)", background: "var(--nav-bg)" }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-slate-950">
            B
          </div>
          <span className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>BizzBills</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/pricing" className="text-sm transition" style={{ color: "var(--muted)" }}>
            Pricing
          </Link>
          <Link href="/contact" className="text-sm transition" style={{ color: "var(--muted)" }}>
            Contact
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm transition"
            style={{ background: "var(--badge-bg)", color: "var(--muted)" }}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {session ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-full border px-4 py-2 text-sm font-medium transition"
                style={{ borderColor: "var(--card-border)", color: "var(--foreground)" }}
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full px-4 py-2 text-sm transition"
                style={{ color: "var(--muted)" }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/signin"
                className="rounded-full px-4 py-2 text-sm font-medium transition"
                style={{ color: "var(--muted)" }}
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
            style={{ background: "var(--badge-bg)", color: "var(--muted)" }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "var(--muted)" }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t px-4 pb-4 pt-2 md:hidden" style={{ borderColor: "var(--card-border)", background: "var(--nav-bg)" }}>
          <Link href="/pricing" className="block py-2 text-sm" style={{ color: "var(--muted)" }}>Pricing</Link>
          <Link href="/contact" className="block py-2 text-sm" style={{ color: "var(--muted)" }}>Contact</Link>
          {session ? (
            <>
              <Link href="/dashboard" className="block py-2 text-sm" style={{ color: "var(--accent)" }}>Dashboard</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="block py-2 text-sm" style={{ color: "var(--muted)" }}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="block py-2 text-sm" style={{ color: "var(--muted)" }}>Sign in</Link>
              <Link href="/auth/register" className="mt-2 block rounded-full bg-cyan-500 px-5 py-2.5 text-center text-sm font-semibold text-slate-950">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

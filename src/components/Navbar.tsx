"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-slate-950">
            B
          </div>
          <span className="text-lg font-semibold text-white">BizzBills</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/pricing" className="text-sm text-slate-300 transition hover:text-white">
            Pricing
          </Link>
          <Link href="/contact" className="text-sm text-slate-300 transition hover:text-white">
            Contact
          </Link>
          {session ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full px-4 py-2 text-sm text-slate-400 transition hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/signin"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
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
        <button
          className="md:hidden text-slate-300"
          onClick={() => setMobileOpen(!mobileOpen)}
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 pb-4 pt-2 md:hidden">
          <Link href="/pricing" className="block py-2 text-sm text-slate-300">Pricing</Link>
          <Link href="/contact" className="block py-2 text-sm text-slate-300">Contact</Link>
          {session ? (
            <>
              <Link href="/dashboard" className="block py-2 text-sm text-cyan-300">Dashboard</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="block py-2 text-sm text-slate-400">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="block py-2 text-sm text-slate-300">Sign in</Link>
              <Link href="/auth/register" className="mt-2 block rounded-full bg-cyan-500 px-5 py-2.5 text-center text-sm font-semibold text-slate-950">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

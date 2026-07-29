"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-default text-default transition hover-brighten"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-20 z-30 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Menu panel */}
           <div className="absolute left-4 right-4 top-20 z-40 rounded-2xl border border-default bg-surface p-4 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="space-y-1">
              <MobileLink href="/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </MobileLink>
              <MobileLink href="/billing" onClick={() => setOpen(false)}>
                Billing
              </MobileLink>
              <MobileLink href="/accounting/chart-of-accounts" onClick={() => setOpen(false)}>
                Accounting
              </MobileLink>
              <MobileLink href="/reports" onClick={() => setOpen(false)}>
                Reports
              </MobileLink>
              <MobileLink href="/accounting/reports" onClick={() => setOpen(false)}>
                Fin. Reports
              </MobileLink>
              <MobileLink href="/gst" onClick={() => setOpen(false)}>
                GST
              </MobileLink>
              <MobileLink href="/ai" onClick={() => setOpen(false)}>
                AI
              </MobileLink>
              <MobileLink href="/payments" onClick={() => setOpen(false)}>
                Payments
              </MobileLink>
              <MobileLink href="/banking" onClick={() => setOpen(false)}>
                Banking
              </MobileLink>
              <MobileLink href="/credit-notes" onClick={() => setOpen(false)}>
                Credit Notes
              </MobileLink>
              <MobileLink href="/debit-notes" onClick={() => setOpen(false)}>
                Debit Notes
              </MobileLink>
              <MobileLink href="/orders" onClick={() => setOpen(false)}>
                Orders
              </MobileLink>
              <MobileLink href="/parties" onClick={() => setOpen(false)}>
                Parties
              </MobileLink>
              <MobileLink href="/payroll" onClick={() => setOpen(false)}>
                Payroll
              </MobileLink>
              <MobileLink href="/inventory" onClick={() => setOpen(false)}>
                Inventory
              </MobileLink>
              <MobileLink href="/recurring-invoices" onClick={() => setOpen(false)}>
                Recurring
              </MobileLink>
              <MobileLink href="/currency" onClick={() => setOpen(false)}>
                Currency
              </MobileLink>
              <MobileLink href="/activity" onClick={() => setOpen(false)}>
                Activity
              </MobileLink>
              <MobileLink href="/settings" onClick={() => setOpen(false)}>
                Settings
              </MobileLink>
            </div>
            <hr className="my-3 border-default"
            {session?.user ? (
              <div className="space-y-2">
                <p className="px-3 text-sm text-muted">
                  {session.user.name ?? session.user.email}
                </p>
                <button
                  onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="w-full rounded-xl border border-default px-3 py-2 text-left text-sm text-default transition hover-brighten"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                onClick={() => setOpen(false)}
                className="block rounded-xl bg-cyan-500 px-3 py-2 text-center text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
              >
                Sign in
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-2 text-sm text-muted transition hover-brighten"
    >
      {children}
    </Link>
  );
}

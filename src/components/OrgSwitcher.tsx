"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { useSession, signOut } from "next-auth/react";

export function OrgSwitcher() {
  const { currentOrgId, currentOrgName, organizations, setOrganizations, switchOrg } =
    useOrg();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ORG_ADMIN" || role === "SUPER_ADMIN";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="hidden sm:inline">{currentOrgName || "No organization"}</span>
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-black/30 backdrop-blur">
            <p className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400">
              Organizations
            </p>
            <div className="space-y-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrg(org.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    org.id === currentOrgId
                      ? "bg-cyan-500/15 text-cyan-200"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {org.name}
                </button>
              ))}
            </div>

            {isAdmin && (
              <>
                <hr className="my-2 border-white/10" />
                <Link
                  href="/organization/settings"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                >
                  Organization Settings
                </Link>
                <Link
                  href="/organization/users"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                >
                  Manage Users
                </Link>
              </>
            )}

            <hr className="my-2 border-white/10" />
            <button
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
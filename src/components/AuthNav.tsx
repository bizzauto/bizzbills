"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function AuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
       <div className="h-8 w-20 animate-pulse rounded-full bg-surface-darker" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
         <span className="hidden text-sm text-muted sm:inline">
          {session.user.name ?? session.user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
           className="rounded-full border border-default px-4 py-2 text-sm font-medium text-default transition hover-brighten"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth/signin"
      className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
    >
      Sign in
    </Link>
  );
}

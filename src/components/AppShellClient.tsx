"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

const PUBLIC_PREFIXES = ["/", "/auth", "/pricing", "/plans", "/terms", "/privacy", "/contact"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function AppShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicRoute = isPublicRoute(pathname);
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  if (publicRoute) {
    return (
      <>
        <KeyboardShortcuts onSearchOpen={openSearch} />
        <GlobalSearch open={searchOpen} onClose={closeSearch} />
        {children}
      </>
    );
  }

  return (
    <>
      <KeyboardShortcuts onSearchOpen={openSearch} />
      <GlobalSearch open={searchOpen} onClose={closeSearch} />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-auto transition-all duration-300 md:pl-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pt-16 md:pt-6">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

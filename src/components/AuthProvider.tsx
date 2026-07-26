"use client";

import { SessionProvider } from "next-auth/react";
import { OrgProvider } from "@/components/OrgProvider";
import { type ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <OrgProvider>{children}</OrgProvider>
    </SessionProvider>
  );
}

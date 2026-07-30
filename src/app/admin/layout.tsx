"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated") {
      const role = (session?.user as { role?: string })?.role;
      if (role !== "SUPER_ADMIN") {
        router.push("/dashboard");
        return;
      }
      setAllowed(true);
    }
  }, [status, session, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent mx-auto" />
          <p className="text-sm text-muted">Checking access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

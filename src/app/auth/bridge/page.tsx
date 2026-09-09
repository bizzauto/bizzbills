"use client";
/**
 * /auth/bridge?token=...
 *
 * Landing page the CRM redirects to. Consumes the one-time bridge token:
 * POST /api/auth/bridge { token } → session cookie set → redirect to /dashboard.
 * On failure, shows a friendly error + manual login link.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BridgePage() {
  const router = useRouter();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Signing you in from CRM...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setState("error");
      setMessage("No bridge token found. Please open BizzBills from the CRM.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setState("done");
          setMessage("Welcome! Taking you to your dashboard...");
          setTimeout(() => router.push("/dashboard"), 800);
        } else {
          setState("error");
          setMessage(data.error || "Bridge sign-in failed. Please log in manually.");
        }
      } catch {
        setState("error");
        setMessage("Something went wrong. Please log in manually.");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/40">
          {state === "error" ? (
            <span className="text-2xl">⚠️</span>
          ) : (
            <span className="block h-6 w-6 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          )}
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {state === "error" ? "Bridge Failed" : state === "done" ? "Signed In" : "BizzBills Bridge"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        {state === "error" && (
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}

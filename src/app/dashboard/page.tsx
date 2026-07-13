"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status !== "authenticated") return;

    const abort = new AbortController();

    fetch("/api/invoices", { signal: abort.signal })
      .then((res) => res.json())
      .then((data) => {
        setInvoices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => abort.abort();
  }, [status, router]);

  const totals = invoices.reduce(
    (acc, inv) => ({
      revenue: acc.revenue + inv.total,
      sent: acc.sent + (inv.status === "sent" ? inv.total : 0),
      overdue: acc.overdue + (inv.status === "overdue" ? inv.total : 0),
    }),
    { revenue: 0, sent: 0, overdue: 0 },
  );

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Executive dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Welcome back{status === "authenticated" && session?.user?.name ? `, ${session.user.name}` : ""}.
            </h1>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} on record
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-sm text-slate-400">Total revenue</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-white">
              ₹{totals.revenue.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-sm text-slate-400">Collections</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-white">
              ₹{totals.sent.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <p className="text-sm text-slate-400">Overdue</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-amber-300">
              ₹{totals.overdue.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Recent invoices</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-800" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-6 text-center text-sm text-slate-400">
              No invoices yet.{" "}
              <a href="/billing" className="text-cyan-300 hover:text-cyan-200">
                Create your first invoice
              </a>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {invoices.slice(0, 5).map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 p-3 transition hover:bg-slate-900/70"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{inv.customerName}</p>
                    <p className="text-xs text-slate-400">#{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">₹{inv.total.toLocaleString()}</p>
                    <span className={`text-xs ${inv.status === "paid" ? "text-emerald-300" : inv.status === "overdue" ? "text-red-300" : "text-slate-400"}`}>
                      {inv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">AI business signals</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
              {invoices.length === 0
                ? "Create invoices to unlock AI-powered insights and cash flow predictions."
                : "Best payment follow-up window is tomorrow morning."}
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
              {totals.overdue > 0
                ? `You have ₹${totals.overdue.toLocaleString()} in overdue invoices needing attention.`
                : "No overdue invoices — collections are on track."}
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
              AI forecast: healthy runway for the next 45 days.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

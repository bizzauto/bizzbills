"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatAmount } from "@/lib/currency";
import { generateUpiLink, generateQrCodeUrl } from "@/lib/upi";

type PaymentDetail = {
  id: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  gatewayRef: string | null;
  upiTransactionId: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  invoice: { invoiceNumber: string; customerName: string; total: number } | null;
};

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      const id = params instanceof Promise ? (await params).id : params?.id;
      if (!id) return;
      const res = await fetch(`/api/payments/${id}`);
      if (res.ok) {
        setPayment(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [params]);

  async function markCompleted() {
    if (!payment) return;
    setUpdating(true);
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) {
      router.refresh();
      setPayment({ ...payment, status: "completed", paidAt: new Date().toISOString() });
    }
    setUpdating(false);
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-6 pb-10">
        <p className="text-sm text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="flex flex-1 flex-col gap-6 pb-10">
        <p className="text-sm text-slate-400">Payment not found.</p>
      </main>
    );
  }

  const upiLink = generateUpiLink({
    pa: "merchant@upi", // Will be replaced with org's UPI ID
    pn: "Business",
    am: String(payment.amount),
    tn: `Payment ${payment.id.slice(0, 8)}`,
    tr: payment.id.slice(0, 12),
  });

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Finance</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Payment Details</h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Amount</span>
              <span className="text-2xl font-semibold text-white">{formatAmount(payment.amount, payment.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                payment.status === "completed" ? "bg-emerald-500/10 text-emerald-300" :
                payment.status === "failed" ? "bg-red-500/10 text-red-300" :
                "bg-amber-500/10 text-amber-300"
              }`}>
                {payment.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Method</span>
              <span className="text-white capitalize">{payment.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date</span>
              <span className="text-white">{new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString()}</span>
            </div>
            {payment.invoice && (
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice</span>
                <Link href={`/invoices/${payment.invoiceId}`} className="text-cyan-300 hover:text-cyan-200">
                  #{payment.invoice.invoiceNumber} — {payment.invoice.customerName}
                </Link>
              </div>
            )}
            {payment.gatewayRef && (
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway Ref</span>
                <span className="font-mono text-xs text-white">{payment.gatewayRef}</span>
              </div>
            )}
            {payment.upiTransactionId && (
              <div className="flex justify-between">
                <span className="text-slate-400">UPI Txn ID</span>
                <span className="font-mono text-xs text-white">{payment.upiTransactionId}</span>
              </div>
            )}
            {payment.notes && (
              <div>
                <span className="text-slate-400 text-sm">Notes</span>
                <p className="mt-1 text-sm text-white">{payment.notes}</p>
              </div>
            )}

            {payment.status === "pending" && (
              <button
                onClick={markCompleted}
                disabled={updating}
                className="w-full rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {updating ? "Updating…" : "Mark as Completed"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {payment.method === "upi" && (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur text-center">
              <h2 className="text-lg font-semibold text-white">UPI Payment</h2>
              <img
                src={generateQrCodeUrl(upiLink, 250)}
                alt="UPI QR Code"
                className="mx-auto mt-4 rounded-xl"
              />
              <p className="mt-3 text-xs text-slate-400">Scan with any UPI app to pay</p>
              <a
                href={upiLink}
                className="mt-3 inline-block rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Open UPI App →
              </a>
            </div>
          )}

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Actions</h2>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 text-left"
              >
                Copy payment link
              </button>
              <Link
                href="/payments"
                className="block w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                ← Back to payments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

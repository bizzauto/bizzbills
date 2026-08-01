"use client";

import Link from "next/link";
import { OfflineInvoiceForm } from "@/components/OfflineInvoiceForm";

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              Offline Mode
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              You&apos;re Currently Offline
            </h1>
            <p className="mt-1 text-sm text-muted">
              Don&apos;t worry! You can still create invoices offline. They&apos;ll
              be synced automatically when you&apos;re back online.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="btn-secondary inline-flex items-center gap-2"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </section>

      {/* Offline Features */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Offline Invoice Form */}
        <OfflineInvoiceForm />

        {/* Offline Info */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-6">
            <h3 className="mb-3 text-lg font-semibold text-default">
              📱 Offline Features
            </h3>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                Create invoices offline
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                View cached invoices and parties
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                Auto-sync when back online
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                No data loss during connectivity issues
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
            <h3 className="mb-3 text-lg font-semibold text-default">
              🔄 Sync Status
            </h3>
            <p className="text-sm text-muted">
              Your offline invoices will be automatically synced to the server
              when your device reconnects to the internet. You can also manually
              trigger a sync from the sync indicator.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-6">
            <h3 className="mb-3 text-lg font-semibold text-default">
              💡 Tips for Offline Usage
            </h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>• Keep the app open in the background for best results</li>
              <li>• Check the sync indicator in the bottom-right corner</li>
              <li>• Offline invoices are stored locally on your device</li>
              <li>• All data is encrypted and secure</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

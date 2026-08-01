"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface NotificationPreferences {
  emailOnInvoiceCreated: boolean;
  emailOnPaymentReceived: boolean;
  emailOnOverdueInvoice: boolean;
  emailOnLowInventory: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

const NOTIFICATION_TYPES: Array<{
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  preview: string;
}> = [
  {
    key: "emailOnInvoiceCreated",
    label: "Invoice Created",
    description: "Get notified when a new invoice is created.",
    preview:
      'Subject: New Invoice #INV-001 created\n\nHi there,\nA new invoice for Acme Corp (₹11,800) has been created and is ready to send.',
  },
  {
    key: "emailOnPaymentReceived",
    label: "Payment Received",
    description: "Get notified when a payment is recorded against an invoice.",
    preview:
      'Subject: Payment received for Invoice #INV-001\n\nHi there,\nPayment of ₹11,800 received from Acme Corp for Invoice #INV-001.',
  },
  {
    key: "emailOnOverdueInvoice",
    label: "Overdue Invoice",
    description: "Get notified when an invoice passes its due date.",
    preview:
      'Subject: Invoice #INV-001 is overdue (15 days)\n\nHi there,\nInvoice #INV-001 for Acme Corp (₹11,800) was due on 15 Jul 2026 and is now 15 days overdue.',
  },
  {
    key: "emailOnLowInventory",
    label: "Low Inventory",
    description: "Get notified when product stock falls below threshold.",
    preview:
      'Subject: Low stock alert — Widget A\n\nHi there,\nWidget A has only 3 units remaining. Consider restocking soon.',
  },
  {
    key: "dailyDigest",
    label: "Daily Digest",
    description: "Receive a daily summary of invoices, payments, and activity.",
    preview:
      'Subject: Daily Digest — 01 Aug 2026\n\nToday\'s summary:\n• 2 invoices created\n• 3 payments received (₹45,200)\n• 1 invoice overdue',
  },
  {
    key: "weeklyReport",
    label: "Weekly Report",
    description: "Receive a weekly summary every Monday morning.",
    preview:
      'Subject: Weekly Report — Week 31, 2026\n\nThis week:\n• 12 invoices created (₹1,84,500)\n• 8 payments received (₹1,32,000)\n• Outstanding: ₹52,500 across 4 invoices',
  },
];

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DIGEST_TIMES = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "18:00",
];

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        enabled ? "bg-cyan-500" : "bg-slate-700"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailOnInvoiceCreated: true,
    emailOnPaymentReceived: true,
    emailOnOverdueInvoice: true,
    emailOnLowInventory: false,
    dailyDigest: false,
    weeklyReport: true,
  });
  const [digestTime, setDigestTime] = useState("08:00");
  const [weeklyReportDay, setWeeklyReportDay] = useState("Monday");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const controller = new AbortController();

    async function loadPreferences() {
      try {
        const res = await fetch("/api/notifications/preferences", {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.preferences) {
            setPreferences(data.preferences);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Silent — defaults are already applied
      }
    }

    loadPreferences();

    return () => controller.abort();
  }, [status]);

  function togglePreference(key: keyof NotificationPreferences) {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setMessage("");
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      setMessage("Notification preferences saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save preferences",
      );
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="pb-10 text-sm text-slate-400">Loading...</main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl pb-10">
      {/* Page Header */}
      <section className="section-card">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-accent">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-default">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose which notifications you receive and how often.
          </p>
        </div>
      </section>

      {/* Status Messages */}
      {message && (
        <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Notification Toggles */}
      <section className="section-card mt-4">
        <h2 className="section-label">Email Notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Select which events trigger an email notification.
        </p>

        <div className="mt-4 space-y-1">
          {NOTIFICATION_TYPES.map((type) => {
            const isEnabled = preferences[type.key];
            const isExpanded = previewKey === type.key;

            return (
              <div key={type.key}>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 transition hover:bg-slate-900/70">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-default">
                      {type.label}
                    </p>
                    <p className="text-xs text-muted">{type.description}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewKey(isExpanded ? null : type.key)
                      }
                      className="text-xs text-accent hover:underline"
                    >
                      {isExpanded ? "Hide preview" : "Preview"}
                    </button>
                    <Toggle
                      enabled={isEnabled}
                      onChange={() => togglePreference(type.key)}
                    />
                  </div>
                </div>

                {/* Notification Preview */}
                {isExpanded && (
                  <div className="mx-4 mb-2 rounded-xl border border-white/10 bg-slate-950/80 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                      Email Preview
                    </p>
                    <pre className="whitespace-pre-wrap text-xs leading-5 text-slate-300">
                      {type.preview}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Schedule Settings */}
      <section className="section-card mt-4">
        <h2 className="section-label">Schedule</h2>
        <p className="mt-1 text-sm text-muted">
          Configure when digest and report notifications are sent.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Daily Digest Time */}
          <div>
            <label className="text-xs text-muted">
              Daily Digest Time
            </label>
            <select
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
              className="input mt-1"
            >
              {DIGEST_TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Your daily summary will be sent at this time.
            </p>
          </div>

          {/* Weekly Report Day */}
          <div>
            <label className="text-xs text-muted">
              Weekly Report Day
            </label>
            <select
              value={weeklyReportDay}
              onChange={(e) => setWeeklyReportDay(e.target.value)}
              className="input mt-1"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Your weekly summary will be sent on this day.
            </p>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </main>
  );
}

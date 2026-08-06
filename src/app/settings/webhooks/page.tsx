"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ── */

type Webhook = {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: string;
};

const AVAILABLE_EVENTS = [
  { value: "invoice.created", label: "Invoice Created", description: "Fired when a new invoice is saved" },
  { value: "invoice.paid", label: "Invoice Paid", description: "Fired when an invoice is marked as paid" },
  { value: "payment.received", label: "Payment Received", description: "Fired when any payment is recorded" },
  { value: "order.created", label: "Order Created", description: "Fired when a new order is created" },
] as const;

/* ── Helpers ── */

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ── Page component ── */

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ── Add form state ── */
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Test state ── */
  const [testingId, setTestingId] = useState<string | null>(null);

  /* ── Delete state ── */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── Fetch webhooks ── */
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data?.webhooks ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  /* ── Create webhook ── */
  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          events: formEvents,
          secret: formSecret || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create webhook");
      }

      const created: Webhook = await res.json();
      setWebhooks((prev) => [...prev, created]);
      setFormUrl("");
      setFormEvents([]);
      setFormSecret("");
      setShowForm(false);
      setMessage("Webhook created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete webhook ── */
  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete webhook");
      }
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      setMessage("Webhook deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete webhook");
    } finally {
      setDeletingId(null);
    }
  }

  /* ── Test webhook ── */
  async function handleTest(id: string) {
    setTestingId(id);
    setError("");
    setMessage("");

    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) return;

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": "webhook.test",
          "X-Webhook-Id": id,
        },
        body: JSON.stringify({
          event: "webhook.test",
          payload: {
            message: "This is a test webhook delivery from BizzAuto.",
            webhookId: id,
          },
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        setMessage(`Test webhook delivered successfully (${res.status}).`);
      } else {
        setMessage(`Test webhook returned status ${res.status}.`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Test webhook failed to deliver",
      );
    } finally {
      setTestingId(null);
    }
  }

  /* ── Toggle event in form ── */
  function toggleEvent(eventValue: string) {
    setFormEvents((prev) =>
      prev.includes(eventValue)
        ? prev.filter((e) => e !== eventValue)
        : [...prev, eventValue],
    );
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center pb-10">
        <p className="text-muted">Loading webhooks...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Page Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              Webhooks
            </h1>
            <p className="mt-1 text-sm text-muted">
              Receive real-time notifications when events happen in your
              organization.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? "Cancel" : "+ Add Webhook"}
          </button>
        </div>
      </section>

      {/* Status messages */}
      {message && (
        <div className="animate-slide-up rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success">
          {message}
        </div>
      )}
      {error && (
        <div className="animate-slide-up rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Add webhook form */}
      {showForm && (
        <section className="section-card animate-slide-up">
          <h2 className="section-label">New Webhook</h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            {/* URL */}
            <label className="block">
              <span className="mb-1 block text-sm text-muted">
                Endpoint URL
              </span>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="input"
                required
              />
            </label>

            {/* Events */}
            <div>
              <span className="mb-2 block text-sm text-muted">
                Events to subscribe
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {AVAILABLE_EVENTS.map((evt) => (
                  <label
                    key={evt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      formEvents.includes(evt.value)
                        ? "border-accent/50 bg-accent/10"
                        : "border-[var(--card-border)] bg-[var(--badge-bg)] hover:bg-[var(--card-hover)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formEvents.includes(evt.value)}
                      onChange={() => toggleEvent(evt.value)}
                      className="mt-0.5 accent-cyan-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-default">
                        {evt.label}
                      </p>
                      <p className="text-xs text-muted">{evt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Secret */}
            <label className="block">
              <span className="mb-1 block text-sm text-muted">
                Secret{" "}
                <span className="text-xs">(optional, used for signature verification)</span>
              </span>
              <input
                type="text"
                value={formSecret}
                onChange={(e) => setFormSecret(e.target.value)}
                placeholder="whsec_..."
                className="input"
              />
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !formUrl || formEvents.length === 0}
                className="btn-primary"
              >
                {saving ? "Creating..." : "Create Webhook"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Webhook List */}
      <section className="section-card">
        <h2 className="section-label">Active Webhooks</h2>
        <p className="mt-1 text-sm text-muted">
          {webhooks.length === 0
            ? "No webhooks configured yet. Create one to start receiving event notifications."
            : `${webhooks.length} webhook${webhooks.length === 1 ? "" : "s"} configured.`}
        </p>

        {webhooks.length > 0 && (
          <div className="mt-4 space-y-3">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="list-item"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${wh.isActive ? "badge-active" : "badge-draft"}`}>
                        {wh.isActive ? "Active" : "Inactive"}
                      </span>
                      <p className="truncate font-mono text-sm font-medium text-default">
                        {wh.url}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {wh.events.map((evt) => (
                        <span
                          key={evt}
                          className="rounded-full border border-[var(--card-border)] bg-[var(--badge-bg)] px-2 py-0.5 text-xs text-muted"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>

                    <p className="mt-1.5 text-xs text-muted">
                      Created {formatDate(wh.createdAt)}
                      {wh.secret && (
                        <span className="ml-2 text-warning">
                          (signed)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTest(wh.id)}
                      disabled={testingId === wh.id}
                      className="btn-secondary text-xs"
                    >
                      {testingId === wh.id ? "Sending..." : "Test"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(wh.id)}
                      disabled={deletingId === wh.id}
                      className="btn-danger text-xs"
                    >
                      {deletingId === wh.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payload format reference */}
      <section className="section-card">
        <h2 className="section-label">Payload Format</h2>
        <p className="mt-2 text-sm text-muted">
          Webhook deliveries include the following JSON body. If a secret is
          configured, verify the <code className="rounded bg-[var(--badge-bg)] px-1.5 py-0.5 text-xs text-accent">X-Webhook-Signature</code> header
          using HMAC-SHA256.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-4 text-xs leading-5 text-default">
          <code>{`{
  "event": "invoice.created",
  "payload": {
    "id": "clx1abc...",
    "invoiceNumber": "INV-001",
    "customerName": "Acme Corp",
    "total": 11800,
    "currency": "INR"
  },
  "timestamp": "2026-07-15T10:30:00Z"
}`}</code>
        </pre>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-default">
            Verifying Signatures
          </h3>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-4 text-xs leading-5 text-default">
            <code>{`// Node.js verification example
const crypto = require("crypto");

function verifyWebhookSignature(payload, signature, secret) {
  const expected = "sha256=" +
    crypto.createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</code>
          </pre>
        </div>
      </section>
    </main>
  );
}

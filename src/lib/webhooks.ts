import { prisma } from "@/lib/db";

/* ── Types ── */

export interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: string;
}

export interface WebhookPayload {
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const WEBHOOK_EVENTS = [
  "invoice.created",
  "invoice.paid",
  "payment.received",
  "order.created",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/* ── Storage helpers (reads/writes org.settings JSON) ── */

function parseSettings(raw: string | null): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function getWebhooksFromSettings(settings: Record<string, unknown>): WebhookEntry[] {
  const raw = settings.webhooks;
  if (!Array.isArray(raw)) return [];
  return raw as WebhookEntry[];
}

function setWebhooksInSettings(
  settings: Record<string, unknown>,
  webhooks: WebhookEntry[],
): string {
  return JSON.stringify({ ...settings, webhooks });
}

/* ── Public API ── */

export async function getWebhooks(orgId: string): Promise<WebhookEntry[]> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });
  if (!org) return [];
  return getWebhooksFromSettings(parseSettings(org.settings));
}

export async function createWebhook(
  orgId: string,
  data: { url: string; events: string[]; secret?: string },
): Promise<WebhookEntry> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });
  const settings = parseSettings(org?.settings ?? null);
  const existing = getWebhooksFromSettings(settings);

  const entry: WebhookEntry = {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    url: data.url,
    events: data.events,
    secret: data.secret,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const updated = [...existing, entry];
  const newSettings = setWebhooksInSettings(settings, updated);

  await prisma.organization.update({
    where: { id: orgId },
    data: { settings: newSettings },
  });

  return entry;
}

export async function deleteWebhook(
  orgId: string,
  webhookId: string,
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });
  const settings = parseSettings(org?.settings ?? null);
  const existing = getWebhooksFromSettings(settings);
  const filtered = existing.filter((w) => w.id !== webhookId);

  if (filtered.length === existing.length) return false;

  const newSettings = setWebhooksInSettings(settings, filtered);
  await prisma.organization.update({
    where: { id: orgId },
    data: { settings: newSettings },
  });

  return true;
}

/* ── HMAC signature helper ── */

async function computeHmac(secret: string, body: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", secret).update(body).digest("hex");
}

/* ── Dispatch ── */

export async function dispatchWebhook(
  orgId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const webhooks = await getWebhooks(orgId);
  const matching = webhooks.filter(
    (w) => w.isActive && w.events.includes(event),
  );

  if (matching.length === 0) return;

  const body: WebhookPayload = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };
  const bodyStr = JSON.stringify(body);

  const deliveries = matching.map(async (webhook) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Id": webhook.id,
      };

      if (webhook.secret) {
        const signature = await computeHmac(webhook.secret, bodyStr);
        headers["X-Webhook-Signature"] = `sha256=${signature}`;
      }

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: bodyStr,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn(
          `[webhook] Delivery failed for ${webhook.id}: ${response.status} ${response.statusText}`,
        );
      }
    } catch (err) {
      console.warn(
        `[webhook] Delivery error for ${webhook.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  });

  await Promise.allSettled(deliveries);
}

export { WEBHOOK_EVENTS };

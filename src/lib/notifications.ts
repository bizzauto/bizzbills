import { prisma } from "@/lib/db";

export interface NotificationPreference {
  emailOnInvoiceCreated: boolean;
  emailOnPaymentReceived: boolean;
  emailOnOverdueInvoice: boolean;
  emailOnLowInventory: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreference = {
  emailOnInvoiceCreated: true,
  emailOnPaymentReceived: true,
  emailOnOverdueInvoice: true,
  emailOnLowInventory: false,
  dailyDigest: false,
  weeklyReport: true,
};

export async function getNotificationPreferences(
  orgId: string,
): Promise<NotificationPreference> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });

  if (!org?.settings) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const parsed = JSON.parse(org.settings) as Record<string, unknown>;
    const stored = parsed.notificationPreferences as
      | Partial<NotificationPreference>
      | undefined;

    if (!stored || typeof stored !== "object") {
      return { ...DEFAULT_PREFERENCES };
    }

    return {
      emailOnInvoiceCreated:
        typeof stored.emailOnInvoiceCreated === "boolean"
          ? stored.emailOnInvoiceCreated
          : DEFAULT_PREFERENCES.emailOnInvoiceCreated,
      emailOnPaymentReceived:
        typeof stored.emailOnPaymentReceived === "boolean"
          ? stored.emailOnPaymentReceived
          : DEFAULT_PREFERENCES.emailOnPaymentReceived,
      emailOnOverdueInvoice:
        typeof stored.emailOnOverdueInvoice === "boolean"
          ? stored.emailOnOverdueInvoice
          : DEFAULT_PREFERENCES.emailOnOverdueInvoice,
      emailOnLowInventory:
        typeof stored.emailOnLowInventory === "boolean"
          ? stored.emailOnLowInventory
          : DEFAULT_PREFERENCES.emailOnLowInventory,
      dailyDigest:
        typeof stored.dailyDigest === "boolean"
          ? stored.dailyDigest
          : DEFAULT_PREFERENCES.dailyDigest,
      weeklyReport:
        typeof stored.weeklyReport === "boolean"
          ? stored.weeklyReport
          : DEFAULT_PREFERENCES.weeklyReport,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function shouldNotify(
  orgId: string,
  event: string,
): Promise<boolean> {
  const prefs = await getNotificationPreferences(orgId);

  const eventMap: Record<string, keyof NotificationPreference> = {
    invoice_created: "emailOnInvoiceCreated",
    payment_received: "emailOnPaymentReceived",
    overdue_invoice: "emailOnOverdueInvoice",
    low_inventory: "emailOnLowInventory",
    daily_digest: "dailyDigest",
    weekly_report: "weeklyReport",
  };

  const prefKey = eventMap[event];
  if (!prefKey) return false;

  return prefs[prefKey];
}

export async function getOverdueInvoices(): Promise<
  Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    total: number;
    daysOverdue: number;
    orgId: string;
  }>
> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["sent", "overdue"] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      total: true,
      dueDate: true,
      status: true,
      orgId: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const overdue: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    total: number;
    daysOverdue: number;
    orgId: string;
  }> = [];

  for (const inv of invoices) {
    if (!inv.orgId) continue;

    const isOverdue = inv.dueDate < todayStr || inv.status === "overdue";
    if (!isOverdue) continue;

    const due = new Date(inv.dueDate);
    const diffTime = today.getTime() - due.getTime();
    const daysOverdue = Math.max(
      0,
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
    );

    if (daysOverdue > 0) {
      overdue.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        total: inv.total,
        daysOverdue,
        orgId: inv.orgId,
      });
    }
  }

  return overdue;
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateInvoiceSummary, type InvoiceDraft } from "@/lib/invoicing";

type TxClient = Prisma.TransactionClient | typeof prisma;

/**
 * Auto-post the double-entry journal entries for a sales invoice:
 *   Debit  Accounts Receivable  (total — what the customer owes)
 *   Credit Revenue              (subtotal − discounts — actual income)
 *   Credit GST Payable          (taxTotal — tax collected)
 *
 * Falls back to the first INCOME/ASSET/LIABILITY account when the preferred
 * codes are missing, and refuses to post with placeholder account IDs
 * (they would violate the JournalEntryLine → ChartOfAccount FK).
 *
 * Returns true when a balanced journal entry was posted.
 */
export async function autoPostInvoiceJournal(
  orgId: string,
  invoice: {
    id: string;
    invoiceNumber: string;
    customerName: string;
  },
  clean: InvoiceDraft,
  summary: ReturnType<typeof calculateInvoiceSummary>,
  tx?: TxClient,
): Promise<boolean> {
  const client = tx ?? prisma;

  const accounts = await client.chartOfAccount.findMany({
    where: { orgId, isActive: true },
    orderBy: { code: "asc" },
  });

  const findAccount = (types: Prisma.ChartOfAccountWhereInput["type"][], preferredCode?: string) => {
    const matches = accounts.filter((a) => types.includes(a.type));
    if (preferredCode) {
      const preferred = matches.find((a) => a.code === preferredCode);
      if (preferred) return preferred;
    }
    return matches[0] ?? null;
  };

  const receivableAccount = findAccount(["ASSET"], "AR");
  const revenueAccount = findAccount(["INCOME"], "REV");
  const taxAccount = findAccount(["LIABILITY"], "GST-PAY");

  // Every journal line must reference a real ChartOfAccount row.
  // Without valid accounts the journal would be corrupt — skip posting.
  if (!receivableAccount || !revenueAccount) {
    console.warn(
      `[journal] Skipping auto-post for ${invoice.invoiceNumber}: missing income/asset accounts in org ${orgId}`,
    );
    return false;
  }

  const revenue = round2(summary.subtotal - summary.discountAmount);
  const lines: { accountId: string; debit: number; credit: number; description: string }[] = [
    { accountId: receivableAccount.id, debit: summary.total, credit: 0, description: `Invoice ${invoice.invoiceNumber} - Receivable` },
    { accountId: revenueAccount.id, debit: 0, credit: revenue, description: `Invoice ${invoice.invoiceNumber} - Revenue` },
  ];
  if (taxAccount && summary.taxTotal > 0) {
    lines.push({ accountId: taxAccount.id, debit: 0, credit: summary.taxTotal, description: `Invoice ${invoice.invoiceNumber} - GST Payable` });
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.warn(
      `[journal] Skipping auto-post for ${invoice.invoiceNumber}: imbalance debit=${totalDebit} credit=${totalCredit}`,
    );
    return false;
  }

  const exists = await client.journalEntry.findFirst({
    where: { reference: `INV-${invoice.invoiceNumber}` },
  });
  if (exists) {
    console.warn(`[journal] Skipping auto-post for ${invoice.invoiceNumber}: journal entry already exists`);
    return false;
  }

  await client.journalEntry.create({
    data: {
      orgId,
      entryNumber: `JE-${invoice.invoiceNumber}`,
      date: new Date(),
      description: `Auto-posted for Invoice ${invoice.invoiceNumber} to ${invoice.customerName}`,
      reference: `INV-${invoice.invoiceNumber}`,
      isPosted: true,
      lines: { create: lines },
    },
  });

  console.log(`[journal] Posted JE-${invoice.invoiceNumber} for ${invoice.customerName}`);
  return true;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

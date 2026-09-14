import { Prisma, AccountType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateInvoiceSummary, type InvoiceDraft } from "@/lib/invoicing";

type TxClient = Prisma.TransactionClient | typeof prisma;

export type JournalLineInput = { accountId: string; debit: number; credit: number; description: string };

const DEFAULT_ACCOUNTS: { code: string; name: string; type: AccountType }[] = [
  { code: "CASH", name: "Cash in Hand", type: AccountType.ASSET },
  { code: "AR", name: "Accounts Receivable", type: AccountType.ASSET },
  { code: "AP", name: "Accounts Payable", type: AccountType.LIABILITY },
  { code: "GST-PAY", name: "GST Payable", type: AccountType.LIABILITY },
  { code: "REV", name: "Sales Revenue", type: AccountType.INCOME },
  { code: "EXP", name: "General Expenses", type: AccountType.EXPENSE },
];

/**
 * Create a minimal chart of accounts for orgs that have none, so
 * auto-posting works out of the box. Strictly a no-op when the org
 * already has active accounts — never touches existing data.
 */
export async function ensureDefaultAccounts(orgId: string, tx?: TxClient): Promise<void> {
  const client = tx ?? prisma;
  const count = await client.chartOfAccount.count({ where: { orgId, isActive: true } });
  if (count > 0) return;
  await client.chartOfAccount.createMany({
    data: DEFAULT_ACCOUNTS.map((a) => ({ orgId, code: a.code, name: a.name, type: a.type })),
  });
  console.log(`[journal] Created default chart of accounts for org ${orgId}`);
}

/**
 * Append running-balance ledger rows for a posted journal entry.
 * Must be called in the same transaction as the journal creation.
 * Balances are chronological per account (backdated entries approximate).
 */
export async function postLedgerLines(
  client: TxClient,
  orgId: string,
  journalEntryId: string,
  entryDate: Date,
  lines: JournalLineInput[],
): Promise<void> {
  for (const line of lines) {
    const last = await client.ledger.findFirst({
      where: { orgId, accountId: line.accountId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });
    const prev = last ? Number(last.balance) : 0;
    await client.ledger.create({
      data: {
        orgId,
        accountId: line.accountId,
        entryDate,
        JournalEntryId: journalEntryId,
        description: line.description,
        debit: round2(line.debit),
        credit: round2(line.credit),
        balance: round2(prev + line.debit - line.credit),
      },
    });
  }
}

/**
 * Remove auto-posted journal + ledger rows by reference (delete cleanup).
 * Journal lines cascade via FK; ledger rows are deleted explicitly.
 */
export async function deleteAutoJournal(client: TxClient, orgId: string, reference: string): Promise<void> {
  const entries = await client.journalEntry.findMany({ where: { orgId, reference }, select: { id: true } });
  for (const e of entries) {
    await client.ledger.deleteMany({ where: { orgId, JournalEntryId: e.id } });
    await client.journalEntry.delete({ where: { id: e.id } });
  }
}

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

  // New orgs often have zero accounts — create the minimal set so the
  // whole accounting module works out of the box instead of silently skipping.
  await ensureDefaultAccounts(orgId, client);

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

  const entryDate = new Date();
  const entry = await client.journalEntry.create({
    data: {
      orgId,
      entryNumber: `JE-${invoice.invoiceNumber}`,
      date: entryDate,
      description: `Auto-posted for Invoice ${invoice.invoiceNumber} to ${invoice.customerName}`,
      reference: `INV-${invoice.invoiceNumber}`,
      isPosted: true,
      lines: { create: lines },
    },
  });

  // Ledger + journal stay in the same transaction — the ledger page and
  // financial reports read ONLY the Ledger table.
  await postLedgerLines(client, orgId, entry.id, entryDate, lines);

  console.log(`[journal] Posted JE-${invoice.invoiceNumber} for ${invoice.customerName}`);
  return true;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type AccountRow = { id: string; code: string; type: AccountType };

function pickCashAccount(accounts: AccountRow[]) {
  return (
    accounts.find((a) => a.code === "CASH" && a.type === AccountType.ASSET) ??
    accounts.find((a) => a.type === AccountType.ASSET && a.code !== "AR") ??
    accounts.find((a) => a.type === AccountType.ASSET) ??
    null
  );
}

/**
 * Auto-post a payment receipt:
 *   Debit  Cash in Hand        (money in)
 *   Credit Accounts Receivable (customer owes less)
 *
 * Never throws — accounting must not break the payment flow.
 */
export async function autoPostPaymentJournal(
  orgId: string,
  payment: { id: string; amount: number },
  label: string,
  tx?: TxClient,
): Promise<boolean> {
  try {
    const client = tx ?? prisma;
    const amount = round2(payment.amount);
    if (!(amount > 0)) return false;

    await ensureDefaultAccounts(orgId, client);
    const accounts = await client.chartOfAccount.findMany({ where: { orgId, isActive: true } });
    const cash = pickCashAccount(accounts);
    const receivable =
      accounts.find((a) => a.code === "AR") ??
      accounts.find((a) => a.type === AccountType.ASSET) ??
      null;
    if (!cash || !receivable || cash.id === receivable.id) {
      console.warn(`[journal] Skipping payment post ${label}: cash/receivable accounts unavailable`);
      return false;
    }

    const reference = `PAY-${payment.id}`;
    const exists = await client.journalEntry.findFirst({ where: { orgId, reference } });
    if (exists) return false;

    const entryDate = new Date();
    const lines: JournalLineInput[] = [
      { accountId: cash.id, debit: amount, credit: 0, description: `${label} - Cash received` },
      { accountId: receivable.id, debit: 0, credit: amount, description: `${label} - Receivable settled` },
    ];
    const entry = await client.journalEntry.create({
      data: {
        orgId,
        entryNumber: `JE-PAY-${payment.id.slice(0, 8).toUpperCase()}`,
        date: entryDate,
        description: `Auto-posted for ${label}`,
        reference,
        isPosted: true,
        lines: { create: lines },
      },
    });
    await postLedgerLines(client, orgId, entry.id, entryDate, lines);
    console.log(`[journal] Posted ${entry.entryNumber} for ${label}`);
    return true;
  } catch (err) {
    console.warn(`[journal] Payment post failed for ${label}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Auto-post an expense:
 *   Debit  General Expenses (or first EXPENSE account)
 *   Credit Cash in Hand
 *
 * Never throws — accounting must not break the expense flow.
 */
export async function autoPostExpenseJournal(
  orgId: string,
  expense: { id: string; amount: number; description: string },
  tx?: TxClient,
): Promise<boolean> {
  try {
    const client = tx ?? prisma;
    const amount = round2(expense.amount);
    if (!(amount > 0)) return false;

    await ensureDefaultAccounts(orgId, client);
    const accounts = await client.chartOfAccount.findMany({ where: { orgId, isActive: true } });
    const expenseAccount = accounts.find((a) => a.type === AccountType.EXPENSE) ?? null;
    const cash = pickCashAccount(accounts);
    if (!expenseAccount || !cash) {
      console.warn(`[journal] Skipping expense post ${expense.id}: expense/cash accounts unavailable`);
      return false;
    }

    const reference = `EXP-${expense.id}`;
    const exists = await client.journalEntry.findFirst({ where: { orgId, reference } });
    if (exists) return false;

    const entryDate = new Date();
    const lines: JournalLineInput[] = [
      { accountId: expenseAccount.id, debit: amount, credit: 0, description: `Expense: ${expense.description}`.slice(0, 200) },
      { accountId: cash.id, debit: 0, credit: amount, description: `Expense paid: ${expense.description}`.slice(0, 200) },
    ];
    const entry = await client.journalEntry.create({
      data: {
        orgId,
        entryNumber: `JE-EXP-${expense.id.slice(0, 8).toUpperCase()}`,
        date: entryDate,
        description: `Auto-posted for expense ${expense.description}`.slice(0, 200),
        reference,
        isPosted: true,
        lines: { create: lines },
      },
    });
    await postLedgerLines(client, orgId, entry.id, entryDate, lines);
    console.log(`[journal] Posted ${entry.entryNumber} for expense ${expense.id}`);
    return true;
  } catch (err) {
    console.warn(`[journal] Expense post failed for ${expense.id}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { type AccountType } from "@prisma/client";
import { calculateInvoiceSummary, sanitizeInvoiceDraft, type InvoiceDraft } from "@/lib/invoicing";
import { snapshotFromInvoice } from "@/lib/diff";
import { getPlanLimit, invoiceCountWhere } from "@/lib/planLimits";



async function findAccount(orgId: string, types: AccountType[], preferredCode?: string) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { orgId, type: { in: types }, isActive: true },
    orderBy: { code: "asc" },
  });
  if (preferredCode) {
    const found = accounts.find((a) => a.code === preferredCode);
    if (found) return found;
  }
  return accounts[0] ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await getSessionOrg() ?? {};

  const whereClause: { userId?: string; orgId?: string } = {
    userId: session.user.id,
  };
  if (orgId) {
    whereClause.orgId = orgId;
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as InvoiceDraft;
    const clean = sanitizeInvoiceDraft(body);
    const summary = calculateInvoiceSummary(clean);

    const { orgId } = (await getSessionOrg()) ?? {};

    // ── Plan limit enforcement (per plan pricing) ──
    // Only enforced for org-scoped invoices; plan limits are per-organization.
    if (orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { plan: true },
      });
      const plan = getPlanLimit(org?.plan);
      if (plan.invoiceLimit !== null) {
        const used = await prisma.invoice.count({ where: invoiceCountWhere(orgId) });
        if (used >= plan.invoiceLimit) {
          return NextResponse.json(
            {
              error: `Plan limit reached: ${plan.invoiceLimit} invoices/month on your current plan. Upgrade to continue.`,
              code: "INVOICE_LIMIT_REACHED",
              limit: plan.invoiceLimit,
              used,
            },
            { status: 403 },
          );
        }
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: clean.invoiceNumber,
        customerName: clean.customerName,
        customerGstin: clean.customerGstin,
        currency: clean.currency,
        dueDate: clean.dueDate,
        subtotal: summary.subtotal,
        taxTotal: summary.taxTotal,
        total: summary.total,
        version: 1,
        userId: session.user.id,
        orgId: orgId ?? undefined,
        lines: {
          create: clean.lines.map((line) => ({
            description: line.description,
            hsnCode: line.hsnCode,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
          })),
        },
      },
      include: { lines: true },
    });

    const snapshot = snapshotFromInvoice(invoice);
    await prisma.invoiceVersion.create({
      data: {
        invoiceId: invoice.id,
        version: 1,
        snapshot: JSON.stringify(snapshot),
        changeComment: "Invoice created",
      },
    });

    if (orgId) {
      await autoPostJournalEntries(orgId, invoice, clean, summary);
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 },
    );
  }
}

async function autoPostJournalEntries(
  orgId: string,
  invoice: { invoiceNumber: string; customerName: string; total: number; subtotal: number; taxTotal: number; id: string },
  clean: { lines: { description: string; quantity: number; unitPrice: number; taxRate: number }[] },
  summary: { subtotal: number; taxTotal: number; total: number },
) {
  const revenueAccount = await findAccount(orgId, ["INCOME"], "REV");
  const receivableAccount = await findAccount(orgId, ["ASSET"], "AR");
  const taxAccount = await findAccount(orgId, ["LIABILITY"], "GST-PAY");

  // Correct double-entry for a sales invoice:
  //   Debit  Accounts Receivable  (total — what customer owes)
  //   Credit Revenue              (subtotal — actual income)
  //   Credit GST Payable          (taxTotal — tax collected)
  const lines: { accountId: string; debit: number; credit: number; description: string }[] = [];

  if (receivableAccount) {
    lines.push({ accountId: receivableAccount.id, debit: summary.total, credit: 0, description: `Invoice ${invoice.invoiceNumber} - Receivable` });
  }

  if (revenueAccount) {
    lines.push({ accountId: revenueAccount.id, debit: 0, credit: summary.subtotal, description: `Invoice ${invoice.invoiceNumber} - Revenue` });
  }

  if (taxAccount && summary.taxTotal > 0) {
    lines.push({ accountId: taxAccount.id, debit: 0, credit: summary.taxTotal, description: `Invoice ${invoice.invoiceNumber} - GST Payable` });
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) < 0.01 && lines.length > 0) {
    await prisma.journalEntry.create({
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
  }
}

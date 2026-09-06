import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import type { AccountType } from "@prisma/client";



async function findAccount(orgId: string, types: AccountType[], preferredCode?: string) {
  let account = preferredCode
    ? await prisma.chartOfAccount.findFirst({ where: { orgId, code: preferredCode, isActive: true } })
    : null;
  if (!account) {
    account = await prisma.chartOfAccount.findFirst({ where: { orgId, type: { in: types }, isActive: true }, orderBy: { createdAt: "asc" } });
  }
  return account;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const notes = await prisma.creditNote.findMany({
    where: { orgId },
    orderBy: { date: "desc" },
    include: {
      lines: true,
      invoice: { select: { invoiceNumber: true } },
    },
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  try {
    const body = await request.json();
    const { invoiceId, customerName, customerGstin, currency, reason, date, lines } = body as {
      invoiceId?: string;
      customerName: string;
      customerGstin?: string;
      currency?: string;
      reason?: string;
      date: string;
      lines: { description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode?: string }[];
    };

    if (!customerName || !lines || lines.length === 0) {
      return NextResponse.json({ error: "Customer name and at least one line required" }, { status: 400 });
    }

    const count = await prisma.creditNote.count({ where: { orgId } });
    let creditNoteNumber = `CN-${String(count + 1).padStart(3, "0")}`;
    const numberCollision = await prisma.creditNote.findFirst({
      where: { orgId, creditNoteNumber },
      select: { id: true },
    });
    if (numberCollision) {
      creditNoteNumber = `${creditNoteNumber}-${Date.now().toString(36).toUpperCase()}`;
    }

    let subtotal = 0;
    let taxTotal = 0;
    const cleanLines = lines.map((l) => {
      const lineTotal = l.quantity * l.unitPrice;
      const lineTax = (lineTotal * l.taxRate) / 100;
      subtotal += lineTotal;
      taxTotal += lineTax;
      return { description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate, hsnCode: l.hsnCode ?? "" };
    });
    const total = subtotal + taxTotal;

    const note = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        orgId,
        invoiceId: invoiceId ?? null,
        customerName,
        customerGstin: customerGstin ?? "",
        currency: currency ?? "INR",
        reason: reason ?? "return",
        subtotal,
        taxTotal,
        total,
        status: "issued",
        date: new Date(date),
        lines: { create: cleanLines },
      },
      include: { lines: true, invoice: { select: { invoiceNumber: true } } },
    });

    // Auto-post journal entries for the credit note (reversal of invoice)
    const revenueAccount = await findAccount(orgId, ["INCOME"], "REV");
    const receivableAccount = await findAccount(orgId, ["ASSET"], "AR");
    const taxAccount = await findAccount(orgId, ["LIABILITY"], "GST-PAY");

    // Correct reversal: Debit Revenue, Debit GST Payable, Credit Accounts Receivable
    const jeLines: { accountId: string; debit: number; credit: number; description: string }[] = [];

    if (revenueAccount) {
      jeLines.push({ accountId: revenueAccount.id, debit: subtotal, credit: 0, description: `Credit Note ${creditNoteNumber} - Revenue reversal` });
    }

    if (taxAccount && taxTotal > 0) {
      jeLines.push({ accountId: taxAccount.id, debit: taxTotal, credit: 0, description: `Credit Note ${creditNoteNumber} - GST reversal` });
    }

    if (receivableAccount) {
      jeLines.push({ accountId: receivableAccount.id, debit: 0, credit: total, description: `Credit Note ${creditNoteNumber} - Receivable reduction` });
    }

    const totalDebit = jeLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = jeLines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) < 0.01 && jeLines.length > 0) {
      await prisma.journalEntry.create({
        data: {
          orgId,
          entryNumber: `JE-CN-${creditNoteNumber}`,
          date: new Date(date),
          description: `Auto-posted for Credit Note ${creditNoteNumber} to ${customerName}`,
          reference: `CREDIT-NOTE-${creditNoteNumber}`,
          isPosted: true,
          lines: { create: jeLines },
        },
      });
    }

    // If linked to invoice, update invoice status back to sent/overdue if it was paid
    if (invoiceId) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "sent" },
      });
    }

    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create credit note" }, { status: 500 });
  }
}


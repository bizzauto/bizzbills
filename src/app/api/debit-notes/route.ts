import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { AccountType } from "@prisma/client";

async function getSessionOrgId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  return user?.orgId;
}

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

  const notes = await prisma.debitNote.findMany({
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
    const { invoiceId, supplierName, supplierGstin, currency, reason, date, lines } = body as {
      invoiceId?: string;
      supplierName: string;
      supplierGstin?: string;
      currency?: string;
      reason?: string;
      date: string;
      lines: { description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode?: string }[];
    };

    if (!supplierName || !lines || lines.length === 0) {
      return NextResponse.json({ error: "Supplier name and at least one line required" }, { status: 400 });
    }

    const count = await prisma.debitNote.count({ where: { orgId } });
    const debitNoteNumber = `DN-${String(count + 1).padStart(3, "0")}`;

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

    const note = await prisma.debitNote.create({
      data: {
        debitNoteNumber,
        orgId,
        invoiceId: invoiceId ?? null,
        supplierName,
        supplierGstin: supplierGstin ?? "",
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

    // Auto-post journal entries for debit note
    const expenseAccount = await findAccount(orgId, ["EXPENSE"], "EXP");
    const payableAccount = await findAccount(orgId, ["LIABILITY"], "AP");
    const taxAccount = await findAccount(orgId, ["LIABILITY"], "GST-PAY");

    const jeLines: { accountId: string; debit: number; credit: number; description: string }[] = [];

    // Reverse purchase expense (credit expense)
    for (const line of cleanLines) {
      const lineTotal = line.quantity * line.unitPrice;
      const lineTax = (lineTotal * line.taxRate) / 100;
      if (expenseAccount) {
        jeLines.push({ accountId: expenseAccount.id, debit: 0, credit: lineTotal, description: `Debit Note ${debitNoteNumber} - ${line.description} reversal` });
      }
      if (lineTax > 0 && taxAccount) {
        jeLines.push({ accountId: taxAccount.id, debit: lineTax, credit: 0, description: `GST ${line.taxRate}% on Debit Note ${debitNoteNumber}` });
      }
    }

    // Reduce payable (debit payable)
    if (payableAccount) {
      jeLines.push({ accountId: payableAccount.id, debit: total, credit: 0, description: `Debit Note ${debitNoteNumber} - Payable reduction` });
    }

    const totalDebit = jeLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = jeLines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) < 0.01 && jeLines.length > 0) {
      await prisma.journalEntry.create({
        data: {
          orgId,
          entryNumber: `JE-${debitNoteNumber}`,
          date: new Date(date),
          description: `Auto-posted for Debit Note ${debitNoteNumber} from ${supplierName}`,
          reference: `DN-${debitNoteNumber}`,
          isPosted: true,
          lines: { create: jeLines },
        },
      });
    }

    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create debit note" }, { status: 500 });
  }
}

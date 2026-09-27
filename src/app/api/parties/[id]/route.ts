import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const party = await prisma.party.findFirst({ where: { id, orgId }, include: { addresses: true } });
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build complete Party Ledger statement
  const isVendor = party.type === "vendor";

  const [invoices, payments, creditNotes, debitNotes] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        orgId,
        customerName: { equals: party.name, mode: "insensitive" },
        status: { notIn: ["draft", "cancelled"] },
      },
      select: { id: true, invoiceNumber: true, total: true, date: true, createdAt: true, status: true },
    }),
    prisma.payment.findMany({
      where: {
        orgId,
        status: "completed",
        invoice: { customerName: { equals: party.name, mode: "insensitive" } },
      },
      select: { id: true, amount: true, method: true, paidAt: true, createdAt: true, invoice: { select: { invoiceNumber: true } } },
    }),
    prisma.creditNote.findMany({
      where: {
        orgId,
        customerName: { equals: party.name, mode: "insensitive" },
        status: { notIn: ["draft", "cancelled"] },
      },
      select: { id: true, creditNoteNumber: true, total: true, date: true, createdAt: true, reason: true },
    }),
    prisma.debitNote.findMany({
      where: {
        orgId,
        supplierName: { equals: party.name, mode: "insensitive" },
        status: { notIn: ["draft", "cancelled"] },
      },
      select: { id: true, debitNoteNumber: true, total: true, date: true, createdAt: true, reason: true },
    }),
  ]);

  type RawEntry = {
    id: string;
    timestamp: number;
    dateStr: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
  };

  const rawEntries: RawEntry[] = [];

  for (const inv of invoices) {
    const d = inv.date ? new Date(inv.date) : inv.createdAt;
    rawEntries.push({
      id: inv.id,
      timestamp: d.getTime(),
      dateStr: inv.date || d.toISOString().split("T")[0],
      type: "Invoice",
      reference: `#${inv.invoiceNumber}`,
      description: `Sales Invoice ${inv.invoiceNumber} (${inv.status})`,
      debit: isVendor ? 0 : inv.total,
      credit: isVendor ? inv.total : 0,
    });
  }

  for (const p of payments) {
    const d = p.paidAt ?? p.createdAt;
    rawEntries.push({
      id: p.id,
      timestamp: d.getTime(),
      dateStr: d.toISOString().split("T")[0],
      type: "Payment",
      reference: p.invoice?.invoiceNumber ? `#${p.invoice.invoiceNumber}` : p.method.toUpperCase(),
      description: `Payment received (${p.method.toUpperCase()})`,
      debit: isVendor ? p.amount : 0,
      credit: isVendor ? 0 : p.amount,
    });
  }

  for (const cn of creditNotes) {
    const d = cn.date ?? cn.createdAt;
    rawEntries.push({
      id: cn.id,
      timestamp: d.getTime(),
      dateStr: d.toISOString().split("T")[0],
      type: "Credit Note",
      reference: `#${cn.creditNoteNumber}`,
      description: `Credit Note / Return (${cn.reason})`,
      debit: isVendor ? cn.total : 0,
      credit: isVendor ? 0 : cn.total,
    });
  }

  for (const dn of debitNotes) {
    const d = dn.date ?? dn.createdAt;
    rawEntries.push({
      id: dn.id,
      timestamp: d.getTime(),
      dateStr: d.toISOString().split("T")[0],
      type: "Debit Note",
      reference: `#${dn.debitNoteNumber}`,
      description: `Debit Note / Return (${dn.reason})`,
      debit: isVendor ? 0 : dn.total,
      credit: isVendor ? dn.total : 0,
    });
  }

  // Sort entries chronologically
  rawEntries.sort((a, b) => a.timestamp - b.timestamp);

  // Compute running balance
  let running = 0;
  const ledger = rawEntries.map((e) => {
    running = running + e.debit - e.credit;
    return {
      ...e,
      runningBalance: Math.round(running * 100) / 100,
    };
  });

  return NextResponse.json({
    ...party,
    ledger,
  });
}

/** Whitelist of party fields clients may set — never spread the raw request body. */
function pickPartyFields(data: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  const stringField = (key: string) => {
    if (typeof data[key] === "string") fields[key] = data[key];
  };
  const numberField = (key: string) => {
    if (typeof data[key] === "number") fields[key] = data[key];
  };
  const boolField = (key: string) => {
    if (typeof data[key] === "boolean") fields[key] = data[key];
  };
  stringField("type");
  stringField("name");
  stringField("gstin");
  stringField("email");
  stringField("phone");
  stringField("notes");
  numberField("creditLimit");
  boolField("isActive");
  // Server-owned: orgId, outstandingBalance — never client-set.
  return fields;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  // Ownership check — the party must belong to the caller's org.
  const existing = await prisma.party.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { addresses, ...data } = body;
    const partyData = pickPartyFields(data);
    const hasAddresses = Array.isArray(addresses) && addresses.length > 0;

    // Addresses are wiped before recreate — one transaction so a failure
    // can never leave a party without addresses.
    const party = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (hasAddresses) {
        await tx.partyAddress.deleteMany({ where: { partyId: id } });
      }
      return tx.party.update({
        where: { id },
        data: {
          ...partyData,
          ...(hasAddresses ? { addresses: { create: addresses } } : {}),
        },
        include: { addresses: true },
      });
    });
    return NextResponse.json(party);
}

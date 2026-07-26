import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

async function getSessionOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true },
  });
  return user?.orgId;
}

export async function GET() {
  const orgId = await getSessionOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: { orgId },
    orderBy: { date: "desc" },
    include: { lines: { orderBy: { id: "asc" } } },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const orgId = await getSessionOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.entryNumber || !body?.date || !body?.lines?.length) {
    return NextResponse.json(
      { error: "Entry number, date, and at least one line are required" },
      { status: 400 },
    );
  }

  const lines = body.lines as { accountId: string; debit: number; credit: number; description: string }[];

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json(
      { error: `Debits (${totalDebit}) and credits (${totalCredit}) must balance` },
      { status: 400 },
    );
  }

  try {
    const entry = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          orgId,
          entryNumber: body.entryNumber,
          date: new Date(body.date),
          description: body.description ?? "",
          reference: body.reference ?? null,
          isPosted: true,
        },
      });

      for (const line of lines) {
        await tx.journalEntryLine.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description ?? "",
          },
        });
      }

      return journalEntry;
    });

    const fullEntry = await prisma.journalEntry.findUnique({
      where: { id: entry.id },
      include: { lines: true },
    });

    return NextResponse.json(fullEntry, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create journal entry" },
      { status: 500 },
    );
  }
}
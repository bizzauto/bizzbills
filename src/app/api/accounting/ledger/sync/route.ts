import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { postLedgerLines, type JournalLineInput } from "@/lib/journal";

/**
 * Backfill ledger rows for posted journal entries that predate the
 * journal→ledger pipeline (or were created while it was missing).
 * Idempotent: entries that already have ledger rows are skipped.
 * Only balanced, posted entries with lines are synced.
 */
export async function POST() {
  const { orgId } = (await getSessionOrg()) ?? {};
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: { orgId, isPosted: true },
    orderBy: { date: "asc" },
    include: { lines: true, _count: { select: { ledgers: true } } },
  });

  let synced = 0;
  const skipped: string[] = [];

  for (const e of entries) {
    if (e._count.ledgers > 0 || e.lines.length === 0) continue;
    const lines: JournalLineInput[] = e.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    }));
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      skipped.push(e.entryNumber);
      continue;
    }
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await postLedgerLines(tx, orgId, e.id, e.date, lines);
    });
    synced++;
  }

  return NextResponse.json({ synced, skipped, total: entries.length });
}

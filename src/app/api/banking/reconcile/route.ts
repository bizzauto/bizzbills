import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";
import { NextResponse } from "next/server";

interface BankEntry {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
}

interface MatchedResult {
  bankEntry: BankEntry;
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string | null;
    invoiceNumber: string | null;
    customerName: string | null;
  };
  dateDiff: number;
  confidence: "high" | "medium" | "low";
}

interface UnmatchedResult {
  bankEntry: BankEntry;
  reason: string;
}

const PROXIMITY_DAYS = 7;

function parseDateString(dateStr: string): Date {
  const normalized = dateStr.trim();
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) return parsed;

  const parts = normalized.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (a > 12) return new Date(a, b - 1, c);
    if (c < 100) return new Date(2000 + c, a - 1, b);
    return new Date(c, a - 1, b);
  }

  return new Date(NaN);
}

function daysBetween(d1: Date, d2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((d1.getTime() - d2.getTime()) / msPerDay));
}

/** Extract invoice numbers and UPI references from description */
function extractReferences(description: string): string[] {
  const refs: string[] = [];
  const invoiceMatch = description.match(
    /(?:inv(?:oice)?|bill|receipt|#)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i
  );
  if (invoiceMatch) refs.push(invoiceMatch[1].toLowerCase());

  const upiMatch = description.match(
    /(?:upi|ref|txn|utr|refno)[\/:\s]*([A-Za-z0-9]+)/i
  );
  if (upiMatch) refs.push(upiMatch[1].toLowerCase());

  return refs;
}

/** Fuzzy description match — checks if key words overlap */
function descriptionSimilarity(a: string, b: string): number {
  const wordsA = new Set(
    a.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean)
  );
  const wordsB = new Set(
    b.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean)
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w) && w.length > 2) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function computeConfidence(
  amountExact: boolean,
  dayDiff: number,
  descScore: number,
  refMatch: boolean
): "high" | "medium" | "low" {
  let score = 0;
  if (amountExact) score += 40;
  if (dayDiff === 0) score += 30;
  else if (dayDiff <= 1) score += 20;
  else if (dayDiff <= 3) score += 10;
  if (refMatch) score += 20;
  if (descScore > 0.3) score += 10;

  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      entries?: BankEntry[];
      bankAccountId?: string;
    };
    const { entries, bankAccountId } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "At least one bank entry is required" },
        { status: 400 }
      );
    }

    const allPayments = await prisma.payment.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: {
          select: { invoiceNumber: true, customerName: true },
        },
      },
    });

    const matched: MatchedResult[] = [];
    const unmatched: UnmatchedResult[] = [];
    const usedPaymentIds = new Set<string>();

    for (const entry of entries) {
      const entryDate = parseDateString(entry.date);
      if (isNaN(entryDate.getTime())) {
        unmatched.push({ bankEntry: entry, reason: "Invalid date" });
        continue;
      }

      const entryRefs = extractReferences(entry.description);
      let bestMatch: MatchedResult | null = null;
      let bestScore = -1;

      for (const payment of allPayments) {
        if (usedPaymentIds.has(payment.id)) continue;

        const amountExact =
          Math.abs(payment.amount - Math.abs(entry.amount)) < 0.01;
        if (!amountExact) continue;

        const paymentDate = payment.paidAt
          ? new Date(payment.paidAt)
          : new Date(payment.createdAt);
        const dayDiff = daysBetween(entryDate, paymentDate);
        if (dayDiff > PROXIMITY_DAYS) continue;

        const paymentDesc = [
          payment.invoice?.invoiceNumber ?? "",
          payment.invoice?.customerName ?? "",
          payment.method,
        ]
          .filter(Boolean)
          .join(" ");
        const descScore = descriptionSimilarity(entry.description, paymentDesc);

        const refMatch = entryRefs.some((ref) =>
          paymentDesc.toLowerCase().includes(ref)
        );

        const confidence = computeConfidence(
          amountExact,
          dayDiff,
          descScore,
          refMatch
        );
        const score =
          (confidence === "high" ? 3 : confidence === "medium" ? 2 : 1) * 100 -
          dayDiff * 10 +
          descScore * 50 +
          (refMatch ? 50 : 0);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            bankEntry: entry,
            payment: {
              id: payment.id,
              amount: payment.amount,
              method: payment.method,
              status: payment.status,
              paidAt: payment.paidAt?.toISOString() ?? null,
              invoiceNumber: payment.invoice?.invoiceNumber ?? null,
              customerName: payment.invoice?.customerName ?? null,
            },
            dateDiff: dayDiff,
            confidence,
          };
        }
      }

      if (bestMatch) {
        matched.push(bestMatch);
        usedPaymentIds.add(bestMatch.payment.id);
      } else {
        const reasons: string[] = [];
        const hasAmountMatch = allPayments.some(
          (p) => Math.abs(p.amount - Math.abs(entry.amount)) < 0.01
        );
        if (!hasAmountMatch) {
          reasons.push("No payment with matching amount");
        } else {
          reasons.push(
            `No payment within ±${PROXIMITY_DAYS} days of ${entry.date}`
          );
        }
        unmatched.push({ bankEntry: entry, reason: reasons.join("; ") });
      }
    }

    // Persist transactions if bankAccountId provided
    if (bankAccountId) {
      const account = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, orgId },
      });
      if (account) {
        const txnData = entries.map((entry) => {
          const match = matched.find(
            (m) =>
              m.bankEntry.date === entry.date &&
              m.bankEntry.amount === entry.amount &&
              m.bankEntry.description === entry.description
          );
          return {
            orgId,
            bankAccountId,
            date: parseDateString(entry.date),
            description: entry.description,
            amount: Math.abs(entry.amount),
            type: entry.type,
            status: match ? "matched" : "unmatched",
            matchedPaymentId: match?.payment.id ?? null,
          };
        });

        await prisma.bankTransaction.createMany({ data: txnData });

        // Update bank account balance
        const creditTotal = entries
          .filter((e) => e.type === "credit")
          .reduce((s, e) => s + e.amount, 0);
        const debitTotal = entries
          .filter((e) => e.type === "debit")
          .reduce((s, e) => s + e.amount, 0);

        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: {
              increment: creditTotal - debitTotal,
            },
          },
        });
      }
    }

    const matchedTotal = matched.reduce(
      (sum, m) => sum + Math.abs(m.bankEntry.amount),
      0
    );
    const unmatchedTotal = unmatched.reduce(
      (sum, u) => sum + Math.abs(u.bankEntry.amount),
      0
    );

    return NextResponse.json({
      matched,
      unmatched,
      summary: {
        totalEntries: entries.length,
        matchedCount: matched.length,
        unmatchedCount: unmatched.length,
        matchedTotal,
        unmatchedTotal,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Reconciliation failed" },
      { status: 500 }
    );
  }
}

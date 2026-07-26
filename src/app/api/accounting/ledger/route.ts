import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSessionOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true },
  });
  return user?.orgId;
}

export async function GET(request: Request) {
  const orgId = await getSessionOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");

  const where: { accountId: string; orgId: string; entryDate?: { gte?: Date; lte?: Date } } = {
    accountId: accountId ?? "",
    orgId,
  };

  if (fromDate || toDate) {
    where.entryDate = {};
    if (fromDate) where.entryDate.gte = new Date(fromDate);
    if (toDate) where.entryDate.lte = new Date(toDate);
  }

  const entries = await prisma.ledger.findMany({
    where,
    orderBy: { entryDate: "desc" },
    include: {
      account: { select: { id: true, name: true, code: true, type: true } },
      journalEntry: { select: { id: true, entryNumber: true, date: true, description: true } },
    },
  });

  return NextResponse.json(entries);
}
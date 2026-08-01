import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const bankAccountId = searchParams.get("bankAccountId");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { orgId };
  if (bankAccountId) where.bankAccountId = bankAccountId;
  if (status) where.status = status;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const [transactions, total] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        bankAccount: {
          select: { name: true, bankName: true },
        },
      },
    }),
    prisma.bankTransaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}

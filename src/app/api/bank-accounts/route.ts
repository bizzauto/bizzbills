import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const accounts = await prisma.bankAccount.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { transactions: true } },
    },
  });

  return NextResponse.json({ accounts });
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
      name?: string;
      accountNumber?: string;
      bankName?: string;
      ifscCode?: string;
      branch?: string;
      type?: string;
      openingBalance?: number;
    };

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.bankAccount.findFirst({
      where: { orgId, name: body.name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this name already exists" },
        { status: 409 }
      );
    }

    const openingBalance = Number(body.openingBalance) || 0;

    const account = await prisma.bankAccount.create({
      data: {
        orgId,
        name: body.name.trim(),
        accountNumber: body.accountNumber?.trim() || "",
        bankName: body.bankName?.trim() || "",
        ifscCode: body.ifscCode?.trim() || "",
        branch: body.branch?.trim() || "",
        type: body.type || "savings",
        openingBalance,
        currentBalance: openingBalance,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}

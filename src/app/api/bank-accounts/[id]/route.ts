import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { id } = await params;

  const account = await prisma.bankAccount.findFirst({
    where: { id, orgId },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        take: 50,
      },
      _count: { select: { transactions: true } },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ account });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      name?: string;
      accountNumber?: string;
      bankName?: string;
      ifscCode?: string;
      branch?: string;
      type?: string;
      openingBalance?: number;
      isActive?: boolean;
    };

    const existing = await prisma.bankAccount.findFirst({
      where: { id, orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (body.name && body.name.trim() !== existing.name) {
      const duplicate = await prisma.bankAccount.findFirst({
        where: { orgId, name: body.name.trim(), id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An account with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, string | number | boolean> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.accountNumber !== undefined)
      updateData.accountNumber = body.accountNumber.trim();
    if (body.bankName !== undefined) updateData.bankName = body.bankName.trim();
    if (body.ifscCode !== undefined) updateData.ifscCode = body.ifscCode.trim();
    if (body.branch !== undefined) updateData.branch = body.branch.trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.openingBalance !== undefined) {
      updateData.openingBalance = Number(body.openingBalance);
      const txnDelta =
        Number(body.openingBalance) - Number(existing.openingBalance);
      updateData.currentBalance =
        Number(existing.currentBalance) + txnDelta;
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const account = await prisma.bankAccount.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ account });
  } catch {
    return NextResponse.json(
      { error: "Failed to update bank account" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { id } = await params;

  const existing = await prisma.bankAccount.findFirst({
    where: { id, orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const txnCount = await prisma.bankTransaction.count({
    where: { bankAccountId: id },
  });
  if (txnCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete account with ${txnCount} transaction(s). Deactivate it instead.`,
      },
      { status: 409 }
    );
  }

  await prisma.bankAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

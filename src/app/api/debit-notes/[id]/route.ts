import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const note = await prisma.debitNote.findFirst({
    where: { id, orgId },
    include: { lines: true, invoice: { select: { invoiceNumber: true, customerName: true, total: true } } },
  });

  if (!note) return NextResponse.json({ error: "Debit note not found" }, { status: 404 });

  return NextResponse.json(note);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const existing = await prisma.debitNote.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: "Debit note not found" }, { status: 404 });

  await prisma.debitNote.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}


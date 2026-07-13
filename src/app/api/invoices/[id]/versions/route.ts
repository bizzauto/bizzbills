import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { snapshotFromInvoice, diffSnapshots } from "@/lib/diff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const versions = await prisma.invoiceVersion.findMany({
    where: { invoiceId: id },
    orderBy: { version: "desc" },
  });

  // Parse snapshots for consistent response shape
  const parsed = versions.map((v) => ({
    ...v,
    snapshot: JSON.parse(v.snapshot),
  }));

  return NextResponse.json(parsed);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: session.user.id },
      include: { lines: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { changeComment } = body as { changeComment?: string };

    const snapshot = snapshotFromInvoice(invoice);

    // Compute diff against the latest version
    const latestVersion = await prisma.invoiceVersion.findFirst({
      where: { invoiceId: id },
      orderBy: { version: "desc" },
    });

    const latestSnapshot = latestVersion
      ? (JSON.parse(latestVersion.snapshot) as ReturnType<typeof snapshotFromInvoice>)
      : null;

    const changes = latestSnapshot ? diffSnapshots(latestSnapshot, snapshot) : [];

    // Create version + bump invoice count atomically
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { version: { increment: 1 } },
      });

      const newVersion = await tx.invoiceVersion.create({
        data: {
          invoiceId: id,
          version: updated.version,
          snapshot: JSON.stringify(snapshot),
          changeComment: changeComment || `${changes.length} change(s) made`,
        },
      });

      return { version: newVersion, changes };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create version";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { diffSnapshots } from "@/lib/diff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await params;
  const orgId = await getSessionOrgId(session.user.id);

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...(orgId ? { orgId } : { userId: session.user.id }) },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const version = await prisma.invoiceVersion.findFirst({
    where: { id: versionId, invoiceId: id },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Compute diff against previous version if it exists
  let diff = null;
  if (version.version > 1) {
    const previous = await prisma.invoiceVersion.findFirst({
      where: { invoiceId: id, version: version.version - 1 },
    });

    if (previous) {
      const before = JSON.parse(previous.snapshot);
      const after = JSON.parse(version.snapshot);
      diff = diffSnapshots(before, after);
    }
  }

  return NextResponse.json({
    ...version,
    snapshot: JSON.parse(version.snapshot),
    diff,
  });
}

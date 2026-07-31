import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  // Fetch user role to check authorization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ORG_ADMIN")) {
    return NextResponse.json(
      { error: "Only admins can approve or reject invoices" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await request.json();
  const { action, reason } = body as { action: "approve" | "reject"; reason?: string };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "Action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  // Verify the invoice belongs to this org
  const invoice = await prisma.invoice.findFirst({
    where: { id, orgId },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const approvalStatus = action === "approve" ? "approved" : "rejected";

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      approvalStatus,
      approvedBy: session.user.id,
      approvedAt: new Date(),
      rejectionReason: action === "reject" ? (reason || null) : null,
    },
    include: { lines: true },
  });

  return NextResponse.json(updated);
}

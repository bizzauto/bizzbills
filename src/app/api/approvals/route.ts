import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [pendingInvoices, pendingOrders, approvedTodayCount, rejectedTodayCount] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { orgId, approvalStatus: "pending_approval" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: { orgId, approvalStatus: "pending_approval" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count({
        where: {
          orgId,
          approvalStatus: "approved",
          approvedAt: { gte: startOfToday },
        },
      }),
      prisma.invoice.count({
        where: {
          orgId,
          approvalStatus: "rejected",
          approvedAt: { gte: startOfToday },
        },
      }),
    ]);

  const invoicesWithType = pendingInvoices.map((inv) => ({
    ...inv,
    docType: "invoice" as const,
  }));

  const ordersWithType = pendingOrders.map((ord) => ({
    ...ord,
    docType: "order" as const,
  }));

  const combined = [...invoicesWithType, ...ordersWithType].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({
    items: combined,
    stats: {
      pendingCount: combined.length,
      approvedToday: approvedTodayCount,
      rejectedToday: rejectedTodayCount,
    },
  });
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

  // Only admins can approve/reject
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ORG_ADMIN")) {
    return NextResponse.json(
      { error: "Only admins can approve or reject" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { docType, docId, action, reason } = body as {
    docType: string;
    docId: string;
    action: "approve" | "reject";
    reason?: string;
  };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "Action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  if (docType === "order") {
    const order = await prisma.order.findFirst({
      where: { id: docId, orgId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const approvalStatus = action === "approve" ? "approved" : "rejected";

    const updated = await prisma.order.update({
      where: { id: docId },
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

  return NextResponse.json({ error: "Invalid docType" }, { status: 400 });
}

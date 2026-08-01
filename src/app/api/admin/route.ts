import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get platform statistics
    const [totalUsers, totalOrgs, totalInvoices, totalPayments] =
      await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.invoice.count(),
        prisma.payment.count(),
      ]);

    // Get revenue
    const revenueResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "completed" },
    });

    // Get subscription stats
    const subscriptionStats = await prisma.organization.groupBy({
      by: ["plan"],
      _count: true,
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOrganizations: totalOrgs,
        totalInvoices,
        totalPayments,
        totalRevenue: revenueResult._sum.amount || 0,
      },
      subscriptions: subscriptionStats.map((s) => ({
        plan: s.plan,
        count: s._count,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}

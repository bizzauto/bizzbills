import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const budgets = await prisma.budget.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch expenses grouped by category for this org
    const expenses = await prisma.expense.findMany({
      where: { orgId },
      select: { category: true, amount: true },
    });

    // Fetch payments grouped for this org
    const payments = await prisma.payment.findMany({
      where: { orgId },
      select: { amount: true },
    });

    // Build spending map by category from expenses
    const expenseSpending: Record<string, number> = {};
    for (const exp of expenses) {
      const cat = exp.category || "other";
      expenseSpending[cat] = (expenseSpending[cat] || 0) + exp.amount;
    }

    // Total payments (unallocated) go towards a generic category
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    const result = budgets.map((budget) => {
      const spent = (expenseSpending[budget.category] || 0) + totalPayments;
      const remaining = Math.max(0, budget.amount - spent);
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
      };
    });

    return NextResponse.json({ budgets: result });
  } catch (error) {
    console.error("GET budget actuals error:", error);
    return NextResponse.json({ error: "Failed to fetch budget actuals" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";

const VALID_PERIODS = ["monthly", "quarterly", "annual"];

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

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("GET budgets error:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const { category, amount, period, startDate } = body;

    if (!category || !amount || !startDate) {
      return NextResponse.json(
        { error: "Category, amount, and start date are required" },
        { status: 400 }
      );
    }

    const budgetPeriod = period || "monthly";
    if (!VALID_PERIODS.includes(budgetPeriod)) {
      return NextResponse.json(
        { error: `Invalid period. Allowed: ${VALID_PERIODS.join(", ")}` },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.create({
      data: {
        orgId,
        category,
        amount: parseFloat(amount),
        period: budgetPeriod,
        startDate,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("POST budget error:", error);
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
  }
}

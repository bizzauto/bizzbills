import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getSessionOrgId(session.user.id);
    const where: any = orgId ? { orgId } : { userId: session.user.id };
    const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getSessionOrgId(session.user.id);
    const body = await request.json();
    const { description, amount, category, date, paymentMethod, notes, isRecurring } = body;

    if (!description || amount == null || !date) {
      return NextResponse.json({ error: "Description, amount, and date are required" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        description, amount: parseFloat(amount), category: category || "other", date, paymentMethod: paymentMethod || "cash",
        notes: notes || "", isRecurring: isRecurring || false,
        userId: session.user.id, orgId: orgId || null,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("POST expenses error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const accounts = await prisma.bankAccount.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }

    const account = await prisma.bankAccount.create({ data: { ...data, orgId } });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("POST /api/bank-accounts error:", error);
    return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSessionOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true },
  });
  return { orgId: user?.orgId, userId: session.user.id };
}

export async function GET() {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { id: true, name: true, gstin: true, currency: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  const gstRates = await prisma.gstRate.findMany({
    where: { orgId: org.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ org, gstRates, settings: { ewbEnabled: true, ewbThreshold: 50000 } });
}

export async function PUT(request: Request) {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { gstin?: string };
  const updates: Record<string, unknown> = {};
  if (body.gstin !== undefined) {
    updates.gstin = body.gstin.toUpperCase().trim();
  }

  await prisma.organization.update({
    where: { id: ctx.orgId },
    data: updates,
  });

  return NextResponse.json({ success: true });
}
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  let setting = await prisma.reminderSetting.findUnique({ where: { orgId } });
  if (!setting) {
    setting = await prisma.reminderSetting.create({
      data: { orgId, enabled: true, daysBefore: 3, sendToCustomer: true },
    });
  }

  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  try {
    const body = await request.json();
    const { enabled, daysBefore, sendToCustomer } = body as {
      enabled?: boolean;
      daysBefore?: number;
      sendToCustomer?: boolean;
    };

    const setting = await prisma.reminderSetting.upsert({
      where: { orgId },
      update: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(daysBefore !== undefined ? { daysBefore } : {}),
        ...(sendToCustomer !== undefined ? { sendToCustomer } : {}),
      },
      create: { orgId, enabled: enabled ?? true, daysBefore: daysBefore ?? 3, sendToCustomer: sendToCustomer ?? true },
    });

    return NextResponse.json(setting);
  } catch {
    return NextResponse.json({ error: "Failed to update reminder settings" }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    return NextResponse.json([], { status: 200 });
  }

  const tenantUsers = await prisma.tenantUser.findMany({
    where: { orgId: user.orgId },
    include: { user: true },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json(
    tenantUsers.map((tu) => ({
      id: tu.user.id,
      name: tu.user.name,
      email: tu.user.email,
      role: tu.role,
      joinedAt: tu.joinedAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true, role: true },
  });

  if (!user?.orgId || !["ORG_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!existing) {
    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await hashPassword(tempPassword);

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        name: body.email.split("@")[0],
        passwordHash,
        orgId: user.orgId,
        role: body.role || "VIEWER",
      },
    });

    await prisma.tenantUser.create({
      data: {
        userId: newUser.id,
        orgId: user.orgId,
        role: body.role || "VIEWER",
      },
    });

    return NextResponse.json(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: body.role || "VIEWER", tempPassword },
      { status: 201 },
    );
  }

  const existingTenant = await prisma.tenantUser.findUnique({
    where: { userId_orgId: { userId: existing.id, orgId: user.orgId } },
  });

  if (existingTenant) {
    return NextResponse.json({ error: "User is already in this organization" }, { status: 409 });
  }

  await prisma.tenantUser.create({
    data: {
      userId: existing.id,
      orgId: user.orgId,
      role: body.role || "VIEWER",
    },
  });

  return NextResponse.json(
    { id: existing.id, email: existing.email, name: existing.name, role: body.role || "VIEWER" },
    { status: 201 },
  );
}
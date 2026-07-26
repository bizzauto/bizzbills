import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, gstin, address, phone, email, currency } = body as {
    name?: string;
    gstin?: string;
    address?: string;
    phone?: string;
    email?: string;
    currency?: string;
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { org: true },
  });

  if (!user?.orgId) {
    return NextResponse.json(
      { error: "No organization found. Create one first." },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (gstin !== undefined) updates.gstin = gstin;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (currency !== undefined) updates.currency = currency;

  try {
    await prisma.organization.update({
      where: { id: user.orgId },
      data: updates,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update organization settings" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { org: true },
  });

  if (!user?.org) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.org.id,
    name: user.org.name,
    slug: user.org.slug,
    gstin: user.org.gstin,
    address: user.org.address,
    phone: user.org.phone,
    email: user.org.email,
    currency: user.org.currency,
    plan: user.org.plan,
  });
}
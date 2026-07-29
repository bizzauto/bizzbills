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

  const { name, slug, businessType, gstin, address, phone, email, currency, website, pan, upiId, bankName, accountName, accountNumber, ifscCode, onboardingCompleted } = body as {
    name?: string; slug?: string; businessType?: string; gstin?: string; address?: string;
    phone?: string; email?: string; currency?: string; website?: string; pan?: string;
    upiId?: string; bankName?: string; accountName?: string; accountNumber?: string; ifscCode?: string; onboardingCompleted?: boolean;
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
  if (slug !== undefined) updates.slug = slug;
  if (gstin !== undefined) updates.gstin = gstin;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (currency !== undefined) updates.currency = currency;
  if (website !== undefined) updates.website = website;
  if (upiId !== undefined) updates.upiId = upiId;
  if (onboardingCompleted !== undefined) updates.settings = JSON.stringify({ onboardingCompleted, businessType, pan, bankName, accountName, accountNumber, ifscCode });

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

  let settings = {};
  try { settings = JSON.parse(user.org.settings || "{}"); } catch {}

  return NextResponse.json({
    id: user.org.id,
    name: user.org.name,
    slug: user.org.slug,
    gstin: user.org.gstin,
    address: user.org.address,
    phone: user.org.phone,
    email: user.org.email,
    currency: user.org.currency,
    website: user.org.website,
    upiId: user.org.upiId,
    plan: user.org.plan,
    onboardingCompleted: (settings as any).onboardingCompleted,
    businessType: (settings as any).businessType,
    pan: (settings as any).pan,
    bankName: (settings as any).bankName,
    accountName: (settings as any).accountName,
    accountNumber: (settings as any).accountNumber,
    ifscCode: (settings as any).ifscCode,
  });
}
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

async function getSessionOrgId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  return user?.orgId;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ hasKey: false, provider: null });
  }

  const config = await prisma.aIConfig.findUnique({
    where: { orgId },
    select: { provider: true, isActive: true },
  });

  return NextResponse.json({
    hasKey: config ? config.isActive : false,
    provider: config?.provider ?? null,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { provider, key } = body as { provider: string; key: string };

    if (!provider || !key) {
      return NextResponse.json({ error: "Provider and key are required" }, { status: 400 });
    }

    const encrypted = encrypt(key);

    await prisma.aIConfig.upsert({
      where: { orgId },
      update: { provider, apiKeyEncrypted: encrypted, isActive: true },
      create: { orgId, provider, apiKeyEncrypted: encrypted },
    });

    return NextResponse.json({
      configured: true,
      provider,
      message: "API key configured and encrypted. AI features will use this provider.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to configure API key" }, { status: 500 });
  }
}

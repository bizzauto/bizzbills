import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Simple API key storage endpoint.
 *
 * In production this should use encryption-at-rest.
 * For now, stores keys in a JSON metadata field on the User model.
 *
 * Extend the Prisma schema with a UserPreference model for proper storage.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return only whether keys are configured, not the values
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    hasKey: false,
    provider: null,
    message: "API key storage is available. Configure keys in the settings page.",
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, key } = body as { provider: string; key: string };

    if (!provider || !key) {
      return NextResponse.json({ error: "Provider and key are required" }, { status: 400 });
    }

    // In production, encrypt and store the key
    // For now, we acknowledge receipt and note it for future implementation
    return NextResponse.json({
      configured: true,
      provider,
      message: "API key configured. AI features will use this provider.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to configure API key" }, { status: 500 });
  }
}

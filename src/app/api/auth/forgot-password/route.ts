import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token in VerificationToken table (reuse NextAuth table)
    await prisma.verificationToken.deleteMany({
      where: { identifier: `password-reset:${user.id}` },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: `password-reset:${user.id}`,
        token,
        expires: new Date(expires),
      },
    });

    // TODO: Send email with reset link
    // For now, return the reset link in response (dev mode)
    const resetUrl = `/auth/reset-password?token=${token}`;
    console.log(`[PASSWORD RESET] ${user.email}: ${resetUrl}`);

    return NextResponse.json({ success: true, resetUrl });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

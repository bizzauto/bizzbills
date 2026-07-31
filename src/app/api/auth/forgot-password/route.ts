import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const identifier = email.trim().toLowerCase();
    const isPhone = /^\d{10,15}$/.test(identifier.replace(/[\s\-+]/g, ""));
    const cleanPhone = identifier.replace(/[\s\-+]/g, "");

    // Find user by email or phone
    const user = isPhone
      ? await prisma.user.findFirst({ where: { phone: cleanPhone } })
      : await prisma.user.findUnique({ where: { email: identifier } });

    // Always return success to prevent enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Clean up old tokens
    await prisma.verificationToken.deleteMany({
      where: { identifier: `password-reset:${user.id}` },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: `password-reset:${user.id}`,
        token,
        expires,
      },
    });

    const resetUrl = `/auth/reset-password?token=${token}`;

    // TODO: Send email/SMS with reset link
    // In production, send via email service (Resend, SendGrid, etc.)
    // For now, log to console only — never return in response
    if (user.email) {
      console.log(`[PASSWORD RESET EMAIL] To: ${user.email}, Link: ${resetUrl}`);
    }
    if (user.phone) {
      console.log(`[PASSWORD RESET SMS] To: ${user.phone}, Link: ${resetUrl}`);
    }

    // Never return the resetUrl in the response — security fix
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

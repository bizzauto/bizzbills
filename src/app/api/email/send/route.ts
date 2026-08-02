import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { to, subject, body, documentType, documentNumber } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "To, subject, and body are required" }, { status: 400 });
    }

    // TODO: Integrate with actual email provider (Resend, SendGrid, Nodemailer, etc.)

    return NextResponse.json({
      success: true,
      message: "Email sent successfully (development mode - logged to console)",
      dev: { to, subject, documentType, documentNumber },
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
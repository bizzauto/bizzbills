import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

/**
 * One-time setup: Create super admin user.
 * Only works if no SUPER_ADMIN exists yet. After first use, this endpoint is disabled.
 */
export async function POST(request: Request) {
  try {
    // Check if a super admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Super admin already exists. This endpoint is disabled." },
        { status: 403 },
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    // Create an org for the super admin
    const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-") + "-" + Date.now().toString(36);

    const org = await prisma.organization.create({
      data: {
        name: name || "BizzAuto Admin",
        slug,
      },
    });

    const user = await prisma.user.create({
      data: {
        email,
        name: name || "Super Admin",
        passwordHash,
        role: "SUPER_ADMIN",
        orgId: org.id,
      },
    });

    await prisma.tenantUser.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: "ORG_ADMIN",
      },
    });

    return NextResponse.json(
      {
        message: "Super admin created successfully",
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Setup super admin error:", error);
    return NextResponse.json(
      { error: "Failed to create super admin" },
      { status: 500 },
    );
  }
}

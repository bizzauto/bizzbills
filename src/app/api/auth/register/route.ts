import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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

    const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-") + "-" + Date.now().toString(36);

    const org = await prisma.organization.create({
      data: {
        name: name || email.split("@")[0],
        slug,
      },
    });

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash,
        orgId: org.id,
        role: "ORG_ADMIN",
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
      { id: user.id, email: user.email, name: user.name, orgId: org.id, role: "ORG_ADMIN" },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}

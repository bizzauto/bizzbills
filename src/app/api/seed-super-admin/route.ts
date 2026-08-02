/**
 * TEMPORARY endpoint — creates a SUPER_ADMIN user.
 *
 * DELETE this file after running once:
 *   GET https://<your-domain>/api/seed-super-admin
 *
 * ⚠️ Remove immediately after the super admin is created.
 */

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const email = "bizzautoai@gmail.com";
    const password = "bizzautoai@123karado";
    const name = "BizzAuto Super Admin";

    // Check if already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Ensure role is SUPER_ADMIN
      if (existing.role !== "SUPER_ADMIN") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: "SUPER_ADMIN" },
        });
      }
      return NextResponse.json({
        success: true,
        message: "Super Admin already exists — role ensured SUPER_ADMIN",
        user: { id: existing.id, email: existing.email, role: "SUPER_ADMIN" },
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Super Admin created successfully!",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create Super Admin" },
      { status: 500 },
    );
  }
}

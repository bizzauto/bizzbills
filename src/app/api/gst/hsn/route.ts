import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET() {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const codes = await prisma.hsnSacCode.findMany({
    where: { orgId: ctx.orgId, isActive: true },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(codes);
}

export async function POST(request: Request) {
  const ctx = await getSessionOrg();
  if (!ctx?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { code: string; description: string; type: string; taxRate: number; chapter?: string; heading?: string; subheading?: string };

  const code = await prisma.hsnSacCode.create({
    data: {
      orgId: ctx.orgId,
      code: body.code.trim().toUpperCase(),
      description: body.description.trim(),
      type: body.type || "hsn",
      taxRate: body.taxRate,
      chapter: body.chapter,
      heading: body.heading,
      subheading: body.subheading,
    },
  });

  return NextResponse.json(code, { status: 201 });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    const where: { orgId: string; entityType?: string; entityId?: string } = { orgId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getSessionOrgId(session.user.id);
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    const { entityType, entityId, fileName, fileUrl, fileType, fileSize } = body;

    if (!entityType || !entityId || !fileName || !fileUrl) {
      return NextResponse.json({ error: "entityType, entityId, fileName, and fileUrl are required" }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        orgId,
        entityType,
        entityId,
        fileName,
        fileUrl,
        fileType: fileType ?? "application/octet-stream",
        fileSize: fileSize ?? 0,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}

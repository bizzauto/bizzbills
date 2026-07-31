import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

// GET /api/admin/audit-log?page=1&limit=50&action=create&entity=invoice&from=2026-01-01&to=2026-12-31
export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);

    // ── Pagination ─────────────────────────────────────────────────
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
      200,
    );
    const skip = (page - 1) * limit;

    // ── Filters ────────────────────────────────────────────────────
    const action = searchParams.get("action")?.trim();
    const entity = searchParams.get("entity")?.trim();
    const fromStr = searchParams.get("from")?.trim();
    const toStr = searchParams.get("to")?.trim();

    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (fromStr || toStr) {
      const createdAt: Record<string, Date> = {};
      if (fromStr) {
        createdAt.gte = new Date(fromStr);
      }
      if (toStr) {
        // Include the entire end day by appending 23:59:59
        const endDate = new Date(toStr);
        endDate.setHours(23, 59, 59, 999);
        createdAt.lte = endDate;
      }
      where.createdAt = createdAt;
    }

    // ── Query ──────────────────────────────────────────────────────
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Audit log error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 },
    );
  }
}

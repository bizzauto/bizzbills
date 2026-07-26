import { prisma } from "@/lib/db";

export async function logActivity(params: { orgId: string; userId?: string; action: string; entity: string; entityId?: string; details?: Record<string, unknown> }) {
  try {
    await prisma.activityLog.create({
      data: {
        orgId: params.orgId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ? JSON.stringify(params.details) : "",
      },
    });
  } catch {
    // silent fail — audit log should never block the primary operation
  }
}

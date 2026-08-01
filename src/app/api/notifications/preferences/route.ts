import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import {
  getNotificationPreferences,
  type NotificationPreference,
} from "@/lib/notifications";

// GET /api/notifications/preferences — read current notification preferences
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const preferences = await getNotificationPreferences(orgId);
  return NextResponse.json({ preferences });
}

// POST /api/notifications/preferences — update notification preferences
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      preferences?: Partial<NotificationPreference>;
    };

    if (!body.preferences || typeof body.preferences !== "object") {
      return NextResponse.json(
        { error: "A preferences object is required." },
        { status: 400 },
      );
    }

    const currentPrefs = await getNotificationPreferences(orgId);

    const booleanKeys: Array<keyof NotificationPreference> = [
      "emailOnInvoiceCreated",
      "emailOnPaymentReceived",
      "emailOnOverdueInvoice",
      "emailOnLowInventory",
      "dailyDigest",
      "weeklyReport",
    ];

    const updatedPrefs: NotificationPreference = {
      ...currentPrefs,
    };

    for (const key of booleanKeys) {
      if (key in body.preferences) {
        const value = body.preferences[key];
        if (typeof value === "boolean") {
          updatedPrefs[key] = value;
        }
      }
    }

    // Read existing settings JSON, merge notificationPreferences into it
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    let settingsRecord: Record<string, unknown> = {};
    if (org?.settings) {
      try {
        settingsRecord = JSON.parse(org.settings) as Record<string, unknown>;
      } catch {
        settingsRecord = {};
      }
    }

    settingsRecord.notificationPreferences = updatedPrefs;

    await prisma.organization.update({
      where: { id: orgId },
      data: { settings: JSON.stringify(settingsRecord) },
    });

    return NextResponse.json({ preferences: updatedPrefs });
  } catch {
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 },
    );
  }
}

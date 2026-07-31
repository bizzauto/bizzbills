import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { getWebhooks, createWebhook, WEBHOOK_EVENTS } from "@/lib/webhooks";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const webhooks = await getWebhooks(orgId);
  return NextResponse.json({ webhooks, events: WEBHOOK_EVENTS });
}

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
      url?: string;
      events?: string[];
      secret?: string;
    };

    if (!body.url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 },
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "URL must use http or https protocol" },
        { status: 400 },
      );
    }

    if (!body.events || body.events.length === 0) {
      return NextResponse.json(
        { error: "At least one event is required" },
        { status: 400 },
      );
    }

    const validEvents = body.events.filter((e) =>
      (WEBHOOK_EVENTS as readonly string[]).includes(e),
    );
    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: "No valid events provided" },
        { status: 400 },
      );
    }

    const webhook = await createWebhook(orgId, {
      url: body.url,
      events: validEvents,
      secret: body.secret || undefined,
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 },
    );
  }
}

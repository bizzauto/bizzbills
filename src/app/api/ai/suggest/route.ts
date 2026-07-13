import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { suggestHsnForInvoice } from "@/lib/ai/gst";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const lines = body.lines as Array<{ description: string }> | undefined;

    if (!lines || !Array.isArray(lines)) {
      return NextResponse.json({ error: "Lines array is required" }, { status: 400 });
    }

    const suggestions = suggestHsnForInvoice(lines);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}

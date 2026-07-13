import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { detectAnomalies } from "@/lib/ai/anomaly";
import { suggestHsnForInvoice } from "@/lib/ai/gst";
import type { InvoiceDraft } from "@/lib/invoicing";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const draft = (await request.json()) as InvoiceDraft;

    const anomalies = detectAnomalies(draft);
    const hsnSuggestions = suggestHsnForInvoice(draft.lines);

    const suggestions = [
      ...hsnSuggestions.map((h) => ({
        type: "hsn" as const,
        title: `HSN ${h.hsnCode}`,
        description: `${h.description} — ${h.taxRate}% GST`,
        confidence: h.confidence,
      })),
      ...anomalies.filter((a) => a.severity === "critical").map((a) => ({
        type: "anomaly" as const,
        title: a.field,
        description: a.message,
        confidence: "high" as const,
        action: a.suggestion,
      })),
    ];

    return NextResponse.json({
      suggestions,
      anomalies,
      hsnSuggestions,
    });
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

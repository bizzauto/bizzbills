import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { detectAnomalies } from "@/lib/ai/anomaly";
import { suggestHsnForInvoice } from "@/lib/ai/gst";
import { llmComplete, getApiKey } from "@/lib/ai/service";
import { prisma } from "@/lib/db";
import type { InvoiceDraft } from "@/lib/invoicing";

async function getSessionOrgId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  return user?.orgId;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const draft = (await request.json()) as InvoiceDraft;
    const orgId = await getSessionOrgId(session.user.id);

    const anomalies = detectAnomalies(draft);
    const hsnSuggestions = suggestHsnForInvoice(draft.lines);
    const hasLlm = orgId ? await getApiKey(orgId) : null;

    let llmAnalysis: string | null = null;
    if (hasLlm) {
      const prompt = `You are an expert invoice analyst for Indian GST compliance.
Review this invoice draft and provide concise suggestions for improvement, compliance checks, and any red flags.

Invoice: ${draft.invoiceNumber}
Customer: ${draft.customerName}
GSTIN: ${draft.customerGstin}
Currency: ${draft.currency}
Due: ${draft.dueDate}

Line items:
${draft.lines.map((l) => `  - ${l.description}: ${l.quantity} x ${l.unitPrice} @ ${l.taxRate}% GST (HSN: ${l.hsnCode || "N/A"})`).join("\n")}

Provide 3-5 short bullet points (one sentence each). Be specific and actionable.`;

      llmAnalysis = await llmComplete(orgId!, prompt, "Analyze this invoice draft.", { temperature: 0.2, maxTokens: 512 });
    }

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
      llmAnalysis,
      source: hasLlm ? "hybrid" : "rule",
    });
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

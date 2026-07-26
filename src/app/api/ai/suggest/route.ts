import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { suggestHsnForInvoice } from "@/lib/ai/gst";
import { llmComplete, getApiKey } from "@/lib/ai/service";
import { prisma } from "@/lib/db";

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
    const body = await request.json();
    const lines = body.lines as Array<{ description: string }> | undefined;

    if (!lines || !Array.isArray(lines)) {
      return NextResponse.json({ error: "Lines array is required" }, { status: 400 });
    }

    const orgId = await getSessionOrgId(session.user.id);
    const hasLlm = orgId ? await getApiKey(orgId) : null;

    if (hasLlm) {
      const prompt = `You are a GST/HSN classification expert for Indian taxation.
For each invoice line item description provided, suggest the most appropriate HSN/SAC code.

Return a JSON array of objects with fields: hsnCode, description, taxRate, confidence.

Invoice lines:
${lines.map((l, i) => `${i + 1}. "${l.description}"`).join("\n")}

Rules:
- HSN codes are 4-8 digit numbers for goods, SAC codes are 4-digit starting with 99 for services
- Common rates: 0% (essentials), 5% (basic goods), 12% (processed), 18% (standard), 28% (luxury)
- Services are typically 18% unless exempt
- Return ONLY a valid JSON array, no other text.`;

      const llmResult = await llmComplete(orgId!, prompt, "Process these line items for HSN classification.", { temperature: 0.1, maxTokens: 1024 });

      if (llmResult) {
        try {
          const jsonStart = llmResult.indexOf("[");
          const jsonEnd = llmResult.lastIndexOf("]");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const suggestions = JSON.parse(llmResult.slice(jsonStart, jsonEnd + 1));
            return NextResponse.json({ suggestions, source: "llm" });
          }
        } catch {
          // LLM output wasn't parseable JSON, fall through to rule-based
        }
      }
    }

    const suggestions = suggestHsnForInvoice(lines);
    return NextResponse.json({ suggestions, source: "rule" });
  } catch {
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}

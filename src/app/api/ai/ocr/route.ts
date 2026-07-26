import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { suggestHsn } from "@/lib/ai/gst";
import { llmVision, getApiKey } from "@/lib/ai/service";
import { prisma } from "@/lib/db";



export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const orgId = await getSessionOrgId(session.user.id);
    const hasLlm = orgId ? await getApiKey(orgId) : null;

    // If LLM is available and the file is an image, use vision API
    if (hasLlm && contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("file");

      if (fileEntry instanceof File) {
        const file = fileEntry as File;
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mimeType = file.type || "image/jpeg";

        const visionResult = await llmVision(
          orgId!,
          "You are an expert at extracting invoice data from images. Extract all line items with descriptions, quantities, unit prices, tax rates, and totals.",
          "Extract every line item from this invoice image. Return a JSON array of { description, quantity, unitPrice, taxRate }. Return ONLY the JSON array, no other text.",
          base64,
          mimeType,
        );

        if (visionResult) {
          try {
            const jsonStart = visionResult.indexOf("[");
            const jsonEnd = visionResult.lastIndexOf("]");
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const items = JSON.parse(visionResult.slice(jsonStart, jsonEnd + 1));
              const recognized = items.map((item: { description: string }) => ({
                ...item,
                hsnSuggestions: suggestHsn(item.description || ""),
              }));
              return NextResponse.json({
                recognized,
                rawText: visionResult,
                lineCount: recognized.length,
                suggestedHsnCount: recognized.filter((r: { hsnSuggestions: unknown[] }) => r.hsnSuggestions.length > 0).length,
                source: "llm-vision",
              });
            }
          } catch {
            // Vision result wasn't parseable, fall through to text extraction
          }
        }
      }
    }

    // Fallback: plain text extraction + rule-based HSN matching
    const textContent = contentType.includes("multipart/form-data")
      ? await extractTextFromFormData(request)
      : await request.text();

    const lines = textContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 3);

    const recognized = lines.flatMap((desc) => {
      const hsnResults = suggestHsn(desc);
      return hsnResults.length > 0
        ? [{ description: desc, hsnSuggestions: hsnResults }]
        : [];
    });

    return NextResponse.json({
      recognized,
      rawText: textContent,
      lineCount: lines.length,
      suggestedHsnCount: recognized.length,
      source: "rule",
    });
  } catch {
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}

async function extractTextFromFormData(request: Request): Promise<string> {
  const formData = await request.formData();
  const fileEntry = formData.get("file");

  if (fileEntry instanceof File) {
    return await fileEntry.text();
  }

  return "";
}


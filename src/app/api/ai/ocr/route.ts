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

    // Upload guards — checked BEFORE buffering the file into memory so an
    // oversized/unsupported upload can never be base64-encoded into a
    // vision request (DoS / cost vector).
    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

    // If LLM is available and the file is an image, use vision API
    if (hasLlm && contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("file");

      if (fileEntry instanceof File) {
        const file = fileEntry as File;
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json(
            { error: "File too large. Maximum size is 10 MB." },
            { status: 413 },
          );
        }
        // Never trust the client-declared MIME alone: also verify a magic
        // number (JPEG FF D8 FF, PNG 89 50 4E 47, WEBP "RIFF"...."WEBP") so a
        // renamed .exe cannot reach the vision pipeline.
        const buffer = Buffer.from(await file.arrayBuffer());
        const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
        const isWebp = buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
        if (!ALLOWED_IMAGE_TYPES.has(file.type) || !(isJpeg || isPng || isWebp)) {
          return NextResponse.json(
            { error: "Unsupported file type. Upload a JPEG, PNG, or WebP image." },
            { status: 415 },
          );
        }
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
    // Same DoS guard for the text path — refuse bodies over 2 MB before
    // reading them into memory.
    const MAX_TEXT_BYTES = 2 * 1024 * 1024;
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_TEXT_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum text size is 2 MB." },
        { status: 413 },
      );
    }
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


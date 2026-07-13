import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { suggestHsn } from "@/lib/ai/gst";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data with a file field" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    // Guard: must be a File object (not a string field)
    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "No file provided or field is not a file upload" },
        { status: 400 },
      );
    }

    const file = fileEntry as File;

    // Read file content as text (simulated OCR extraction)
    const text = await file.text();

    const lines = text
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
      rawText: text,
      lineCount: lines.length,
      suggestedHsnCount: recognized.length,
    });
  } catch {
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}

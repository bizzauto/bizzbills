"use client";

import { useState, useRef } from "react";

export default function AiOcrPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    recognized: Array<{ description: string; hsnSuggestions: Array<{ hsnCode: string; taxRate: number }> }>;
    source: string;
    lineCount: number;
  } | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">OCR Scanner</h1>
        <p className="mt-1 text-sm text-slate-400">Upload an invoice image or text file to extract line items with HSN suggestions.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.txt,.csv"
            className="w-full text-sm text-slate-300 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
          />
          <button
            onClick={handleUpload}
            disabled={loading}
            className="mt-4 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Upload & Scan"}
          </button>
          <p className="mt-3 text-xs text-slate-500">Supports images (JPG, PNG), text files, and CSV. With an AI key, images are processed via vision API.</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Recognized Items</h2>
          {result ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">{result.lineCount} lines found · Source: {result.source === "llm-vision" ? "AI Vision" : "Text extraction"}</p>
              {result.recognized.map((item, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-sm text-white">{item.description}</p>
                  {item.hsnSuggestions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.hsnSuggestions.map((h, j) => (
                        <span key={j} className="rounded-full bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                          HSN {h.hsnCode} ({h.taxRate}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Upload a file to see extracted items.</p>
          )}
        </div>
      </div>
    </main>
  );
}

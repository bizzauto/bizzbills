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
      <section className="section-card">
        <p className="text-sm uppercase tracking-[0.25em] text-accent-light">AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-default">OCR Scanner</h1>
        <p className="mt-1 text-sm text-muted">Upload an invoice image or text file to extract line items with HSN suggestions.</p>
      </section>

        <div className="grid gap-6 lg:grid-cols-2">
         <div className="section-card">
           <label className="text-sm text-muted">
             <span className="text-muted">Upload file</span>
             <input
               ref={fileRef}
               type="file"
               accept="image/*,.txt,.csv"
               className="input mt-1 w-full"
             />
           </label>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="mt-4 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50 hover-brighten"
          >
             {loading ? "Scanning…" : "Upload & Scan"}
           </button>
           <p className="mt-3 text-xs text-muted">Supports images (JPG, PNG), text files, and CSV. With an AI key, images are processed via vision API.</p>
         </div>

         <div className="section-card">
        <h2 className="text-lg font-semibold text-default">Recognized Items</h2>
        {result ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted">{result.lineCount} lines found · Source: {result.source === "llm-vision" ? "AI Vision" : "Text extraction"}</p>
            {result.recognized.map((item, i) => (
              <div key={i} className="rounded-xl border border-default bg-surface-darker p-3">
                <p className="text-sm text-default">{item.description}</p>
                {item.hsnSuggestions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.hsnSuggestions.map((h, j) => (
                      <span key={j} className="rounded-full bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-accent-light">
                        HSN {h.hsnCode} ({h.taxRate}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Upload a file to see extracted items.</p>
        )}
        </div>
      </div>
    </main>
  );
}

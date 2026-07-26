"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AiDraftPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<{
    llmAnalysis: string | null;
    suggestions: Array<{ title: string; description: string; confidence: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDraft() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: "",
          customerGstin: "",
          currency: "INR",
          invoiceNumber: "AI-DRAFT",
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          lines: [
            { id: "1", description: prompt, quantity: 1, unitPrice: 0, taxRate: 18, hsnCode: "" },
          ],
        }),
      });

      if (!res.ok) {
        setError("AI analysis failed. Configure an API key in Settings.");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to connect. Check your API key.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Invoice Drafting</h1>
        <p className="mt-1 text-sm text-slate-400">Describe the invoice you want to create and AI will help draft it.</p>
      </section>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "Consulting services for March 2026, 40 hours at ₹5,000/hr, 18% GST"'
          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
        />
        <button
          onClick={handleDraft}
          disabled={loading || !prompt.trim()}
          className="mt-3 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze & Suggest"}
        </button>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {result.llmAnalysis && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white">AI Analysis</h3>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-200 whitespace-pre-wrap">
                  {result.llmAnalysis}
                </div>
              </div>
            )}

            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white">Suggestions</h3>
                <div className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{s.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.confidence === "high" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                          {s.confidence}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/billing")}
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Go to billing →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

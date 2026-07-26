"use client";

import { useState } from "react";

export default function AiSuggestionsPage() {
  const [descriptions, setDescriptions] = useState("");
  const [results, setResults] = useState<{ suggestions: Array<{ hsnCode: string; description: string; taxRate: number; confidence: string }>; source: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSuggest() {
    if (!descriptions.trim()) return;
    setLoading(true);

    try {
      const lines = descriptions.split("\n").filter((l) => l.trim()).map((d) => ({ description: d.trim() }));
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      const data = await res.json();
      setResults(data);
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
        <h1 className="mt-2 text-3xl font-semibold text-white">GST / HSN Suggestions</h1>
        <p className="mt-1 text-sm text-slate-400">Enter line item descriptions to get HSN/SAC code suggestions.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <textarea
            value={descriptions}
            onChange={(e) => setDescriptions(e.target.value)}
            placeholder="One description per line&#10;e.g.&#10;Professional consulting services&#10;Software license subscription&#10;Office furniture"
            className="min-h-[200px] w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
          />
          <button
            onClick={handleSuggest}
            disabled={loading || !descriptions.trim()}
            className="mt-3 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Processing…" : "Get Suggestions"}
          </button>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Results</h2>
          {results ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-500">Source: {results.source === "llm" ? "AI" : "Rule-based"}</p>
              {results.suggestions.length === 0 && <p className="text-sm text-slate-400">No matches found.</p>}
              {results.suggestions.map((s, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-cyan-300">{s.hsnCode}</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">{s.taxRate}%</span>
                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-slate-400">{s.confidence}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{s.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Results will appear here.</p>
          )}
        </div>
      </div>
    </main>
  );
}

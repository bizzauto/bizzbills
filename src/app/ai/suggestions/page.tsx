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
      <section className="section-card">
        <p className="text-sm uppercase tracking-[0.25em] text-accent-light">AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-default">GST / HSN Suggestions</h1>
        <p className="mt-1 text-sm text-muted">Enter line item descriptions to get HSN/SAC code suggestions.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="section-card">
          <textarea
            value={descriptions}
            onChange={(e) => setDescriptions(e.target.value)}
            placeholder="One description per line&#10;e.g.&#10;Professional consulting services&#10;Software license subscription&#10;Office furniture"
            className="input min-h-[200px] resize-y"
          />
          <button
            onClick={handleSuggest}
            disabled={loading || !descriptions.trim()}
            className="mt-3 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Processing…" : "Get Suggestions"}
          </button>
        </div>

        <div className="section-card">
          <h2 className="text-lg font-semibold text-default">Results</h2>
          {results ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted">Source: {results.source === "llm" ? "AI" : "Rule-based"}</p>
              {results.suggestions.length === 0 && <p className="text-sm text-muted">No matches found.</p>}
              {results.suggestions.map((s, i) => (
                <div key={i} className="rounded-xl border border-default bg-surface-darker p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-accent-light">{s.hsnCode}</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">{s.taxRate}%</span>
                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-muted">{s.confidence}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{s.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Results will appear here.</p>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";

export default function AiAnalyzePage() {
  const [invoiceId, setInvoiceId] = useState("");
  const [result, setResult] = useState<{
    llmAnalysis: string | null;
    anomalies: Array<{ severity: string; field: string; message: string; suggestion: string }>;
    hsnSuggestions: Array<{ hsnCode: string; description: string; taxRate: number; confidence: string }>;
    source: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!invoiceId.trim()) return;
    setLoading(true);
    setError("");

    try {
      const invRes = await fetch(`/api/invoices/${invoiceId}`);
      if (!invRes.ok) {
        setError("Invoice not found");
        return;
      }
      const invoice = await invRes.json();

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: invoice.customerName,
          customerGstin: invoice.customerGstin,
          currency: invoice.currency,
          invoiceNumber: invoice.invoiceNumber,
          dueDate: invoice.dueDate,
          lines: invoice.lines.map((l: { id: string; description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode: string }) => ({
            id: l.id,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            hsnCode: l.hsnCode || "",
          })),
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Analysis failed. Check your API key.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Invoice Analysis</h1>
        <p className="mt-1 text-sm text-slate-400">Analyze an existing invoice for anomalies, compliance, and AI-powered insights.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <label className="text-sm text-slate-300">
            <span className="text-slate-400">Invoice ID</span>
            <input
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Paste an invoice ID to analyze"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
            />
          </label>
          <button
            onClick={handleAnalyze}
            disabled={loading || !invoiceId.trim()}
            className="mt-4 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze Invoice"}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Results</h2>
          {result ? (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">Source: {result.source}</p>

              {result.llmAnalysis && (
                <div>
                  <h3 className="text-sm font-medium text-cyan-300">AI Insights</h3>
                  <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                    {result.llmAnalysis}
                  </div>
                </div>
              )}

              {result.anomalies.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-amber-300">Anomalies</h3>
                  <div className="mt-2 space-y-2">
                    {result.anomalies.map((a, i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${a.severity === "critical" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>
                            {a.severity}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{a.field}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-200">{a.message}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{a.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.anomalies.length === 0 && !result.llmAnalysis && (
                <p className="text-sm text-slate-400">No issues found. Invoice looks clean.</p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Enter an invoice ID to see analysis results.</p>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AiStatus = {
  hasKey: boolean;
  provider: string | null;
};

const features = [
  {
    title: "Invoice Drafting",
    description: "Describe an invoice in natural language and let AI build it for you.",
    href: "/ai/draft",
    requiresKey: true,
    icon: "✍",
  },
  {
    title: "GST / HSN Suggestions",
    description: "Smart HSN code suggestions for your line items using AI + rule matching.",
    href: "/ai/suggestions",
    requiresKey: false,
    icon: "🏷",
  },
  {
    title: "OCR Scanner",
    description: "Upload an invoice image and extract line items automatically.",
    href: "/ai/ocr",
    requiresKey: false,
    icon: "📄",
  },
  {
    title: "Invoice Analysis",
    description: "Get anomaly detection, compliance checks, and AI-powered insights.",
    href: "/ai/analyze",
    requiresKey: false,
    icon: "🔍",
  },
];

export default function AiDashboard() {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    fetch("/api/ai/keys").then((r) => r.json()).then((d) => setStatus(d && !d.error ? d : null)).catch(() => {});
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
           <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">AI</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">AI Assistant</h1>
           </div>
          {status && (
            <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ${status.hasKey ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
              <span className={`h-2 w-2 rounded-full ${status.hasKey ? "bg-emerald-400" : "bg-amber-400"}`} />
              {status.hasKey ? `${status.provider === "anthropic" ? "Claude" : "OpenAI"} connected` : "No AI key configured"}
            </div>
          )}
        </div>
      </section>

      {status && !status.hasKey && (
        <div className="section-card">
          <p className="text-sm text-amber-200">
            <Link href="/ai/settings" className="underline hover:text-amber-100">Configure an AI provider</Link> to unlock LLM-powered features. Free options available!
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur transition hover:border-cyan-500/50 hover:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{f.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{f.title}</h2>
                  {f.requiresKey && !status?.hasKey && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                      needs key
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{f.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

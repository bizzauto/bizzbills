"use client";

import { useState } from "react";

type AiProvider = {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  docsUrl: string;
};

const providers: AiProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4 for advanced invoice drafting, anomaly detection, and OCR.",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "Claude for document analysis, GST suggestions, and natural-language drafting.",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
];

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0].id);
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch("/api/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, key }),
      });

      if (res.ok) {
        setSaved(true);
        setKey("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Configure AI provider</h1>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">AI provider</h2>
          <p className="mt-1 text-sm text-slate-400">
            Connect an AI service to power smart invoice drafting, GST suggestions, and anomaly detection.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div className="space-y-3">
              {providers.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    selectedProvider === p.id
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-white/10 bg-slate-950/70 hover:bg-slate-900/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.id}
                    checked={selectedProvider === p.id}
                    onChange={() => setSelectedProvider(p.id)}
                    className="mt-1 accent-cyan-400"
                  />
                  <div>
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <label className="block text-sm text-slate-300">
              <span className="mb-1 flex items-center justify-between text-slate-400">
                <span>API key</span>
                <a
                  href={providers.find((p) => p.id === selectedProvider)?.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Get key →
                </a>
              </span>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={providers.find((p) => p.id === selectedProvider)?.placeholder}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </label>

            {saved && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                API key configured. AI features are now active.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !key}
              className="rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save configuration"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Features requiring AI</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <span className="font-medium text-white">GST / HSN suggestions</span>
                <p className="mt-0.5 text-slate-400">Works without an API key using built-in rule matching.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <span className="font-medium text-white">Anomaly detection</span>
                <p className="mt-0.5 text-slate-400">Works without an API key using rule-based checks.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <span className="font-medium text-white">OCR document scanning</span>
                <p className="mt-0.5 text-slate-400">Uses built-in extraction without an API key.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <span className="font-medium text-white">AI invoice drafting</span>
                <p className="mt-0.5 text-slate-400">Requires an API key for natural language generation.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Privacy</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              API keys are stored locally. Invoice data sent to external AI providers is subject to their privacy policy.
              For full data control, run a local model or keep AI features disabled.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

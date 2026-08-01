"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type AiStatus = {
  hasKey: boolean;
  provider: string | null;
};

type ProviderConfig = {
  id: string;
  name: string;
  description: string;
  keyPlaceholder: string;
  getKeyUrl: string;
  isFree: boolean;
  freeQuota?: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Advanced AI for invoice drafting and analysis. Best quality.",
    keyPlaceholder: "sk-ant-api03-...",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
    isFree: false,
  },
  {
    id: "openai",
    name: "OpenAI (GPT-4)",
    description: "Popular AI provider with good general capabilities.",
    keyPlaceholder: "sk-...",
    getKeyUrl: "https://platform.openai.com/api-keys",
    isFree: false,
  },
  {
    id: "groq",
    name: "Groq (Free Tier)",
    description: "Fast inference with free tier available. Great for getting started.",
    keyPlaceholder: "gsk_...",
    getKeyUrl: "https://console.groq.com/keys",
    isFree: true,
    freeQuota: "Free tier: 30 req/min, 14,400 req/day",
  },
  {
    id: "together",
    name: "Together AI (Free Credits)",
    description: "Open source models with free credits for new users.",
    keyPlaceholder: "tok_...",
    getKeyUrl: "https://api.together.xyz/settings/api-keys",
    isFree: true,
    freeQuota: "$1 free credits for new accounts",
  },
  {
    id: "openrouter",
    name: "OpenRouter (Multiple Models)",
    description: "Access to multiple AI models with pay-per-use pricing.",
    keyPlaceholder: "sk-or-...",
    getKeyUrl: "https://openrouter.ai/keys",
    isFree: false,
  },
  {
    id: "custom",
    name: "Custom / Self-Hosted",
    description: "Use any OpenAI-compatible API (Ollama, LM Studio, etc.).",
    keyPlaceholder: "Your API key",
    getKeyUrl: "",
    isFree: true,
    freeQuota: "Free if self-hosted",
  },
];

export default function AiSettingsPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("groq");
  const [apiKey, setApiKey] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/ai/keys")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        if (data.provider) {
          setSelectedProvider(data.provider);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          key: apiKey.trim(),
          baseUrl: selectedProvider === "custom" ? customBaseUrl : undefined,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setStatus({ hasKey: true, provider: selectedProvider });
        setApiKey(""); // Clear for security
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save API key");
      }
    } catch {
      setError("Failed to save API key");
    } finally {
      setSaving(false);
    }
  }, [selectedProvider, apiKey, customBaseUrl]);

  const handleRemoveKey = useCallback(async () => {
    if (!confirm("Are you sure you want to remove your API key?")) return;

    setSaving(true);
    try {
      const res = await fetch("/api/ai/keys", { method: "DELETE" });
      if (res.ok) {
        setStatus({ hasKey: false, provider: null });
        setSelectedProvider("groq");
        setApiKey("");
        setSaved(false);
      }
    } catch {
      console.error("Failed to remove API key");
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              AI Settings
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              Configure AI Provider
            </h1>
            <p className="mt-1 text-sm text-muted">
              Set up your AI API key to unlock smart features. Free options
              available!
            </p>
          </div>
          <Link
            href="/ai"
            className="btn-secondary inline-flex items-center gap-2"
          >
            ← Back to AI
          </Link>
        </div>
      </section>

      {/* Current Status */}
      {status?.hasKey && (
        <section className="section-card border-success/20 bg-success/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-default">
                  {PROVIDERS.find((p) => p.id === status.provider)?.name ||
                    status.provider}{" "}
                  connected
                </p>
                <p className="text-sm text-muted">
                  AI features are ready to use
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveKey}
              disabled={saving}
              className="rounded-lg border border-danger/20 px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              Remove Key
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Provider Selection */}
        <section className="section-card">
          <h2 className="section-label">Select Provider</h2>
          <p className="mb-4 text-sm text-muted">
            Choose an AI provider. Free options are marked with 🆓.
          </p>

          <div className="space-y-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => setSelectedProvider(provider.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedProvider === provider.id
                    ? "border-accent bg-accent/10"
                    : "border-[var(--card-border)] bg-[var(--badge-bg)] hover:border-accent/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-default">
                        {provider.name}
                      </p>
                      {provider.isFree && (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                          🆓 FREE
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {provider.description}
                    </p>
                    {provider.freeQuota && (
                      <p className="mt-1 text-xs text-green-400">
                        {provider.freeQuota}
                      </p>
                    )}
                  </div>
                  <div
                    className={`mt-1 h-4 w-4 rounded-full border-2 ${
                      selectedProvider === provider.id
                        ? "border-accent bg-accent"
                        : "border-[var(--input-border)]"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* API Key Input */}
        <section className="section-card">
          <h2 className="section-label">API Key Configuration</h2>

          <div className="space-y-4">
            {/* Get Key Link */}
            {PROVIDERS.find((p) => p.id === selectedProvider)?.getKeyUrl && (
              <div className="rounded-xl bg-accent/5 p-3 text-sm">
                <p className="text-muted">
                  Don&apos;t have an API key?{" "}
                  <a
                    href={
                      PROVIDERS.find((p) => p.id === selectedProvider)
                        ?.getKeyUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent hover:text-accent/80"
                  >
                    Get one from {PROVIDERS.find((p) => p.id === selectedProvider)?.name} →
                  </a>
                </p>
              </div>
            )}

            {/* Custom Base URL */}
            {selectedProvider === "custom" && (
              <div>
                <label className="block text-sm font-medium text-default mb-1">
                  Base URL (OpenAI-compatible endpoint)
                </label>
                <input
                  type="url"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-muted">
                  For Ollama: http://localhost:11434/v1
                  <br />
                  For LM Studio: http://localhost:1234/v1
                </p>
              </div>
            )}

            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-default mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    PROVIDERS.find((p) => p.id === selectedProvider)
                      ?.keyPlaceholder
                  }
                  className="input w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default"
                >
                  {showKey ? "🙈" : "👁"}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                Your key is encrypted and stored securely. It never leaves your
                server.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Success */}
            {saved && (
              <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success">
                API key saved successfully! AI features are now available.
              </div>
            )}

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
              className="btn-primary w-full justify-center py-3"
            >
              {saving ? "Saving..." : "Save API Key"}
            </button>

            {/* Security Note */}
            <div className="rounded-xl bg-[var(--badge-bg)] p-4 text-xs text-muted">
              <p className="font-medium text-default mb-1">🔒 Security</p>
              <ul className="space-y-1">
                <li>• API keys are encrypted with AES-256 before storage</li>
                <li>• Keys are only used server-side, never exposed to browsers</li>
                <li>• You can remove your key at any time</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Free Options Guide */}
      <section className="section-card">
        <h2 className="section-label">🆓 Free AI Options</h2>
        <p className="mb-4 text-sm text-muted">
          Get started with AI features without spending anything!
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <h3 className="font-medium text-default">Groq (Recommended)</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>• Free tier: 30 requests/min</li>
              <li>• 14,400 requests/day</li>
              <li>• Fast inference speeds</li>
              <li>• Llama 3 & Mixtral models</li>
            </ul>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-accent hover:text-accent/80"
            >
              Get Free Key →
            </a>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <h3 className="font-medium text-default">Together AI</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>• $1 free credits</li>
              <li>• Multiple open source models</li>
              <li>• No credit card required</li>
            </ul>
            <a
              href="https://api.together.xyz/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-accent hover:text-accent/80"
            >
              Get Free Credits →
            </a>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <h3 className="font-medium text-default">Self-Hosted (Ollama)</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>• 100% free forever</li>
              <li>• Run on your own hardware</li>
              <li>• Full privacy control</li>
              <li>• No API key needed</li>
            </ul>
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-accent hover:text-accent/80"
            >
              Download Ollama →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

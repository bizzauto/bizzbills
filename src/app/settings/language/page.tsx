"use client";

import { useState, useEffect } from "react";
import { t, getLocale, setLocale, getLocaleName, getAvailableLocales, type Locale } from "@/lib/i18n";

const previewKeys = [
  "dashboard",
  "invoices",
  "customers",
  "payments",
  "reports",
  "settings",
  "save",
  "cancel",
  "delete",
  "search",
  "total",
  "due_date",
  "status",
  "amount",
  "welcome",
];

export default function LanguagePage() {
  const [selected, setSelected] = useState<Locale>("en");
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSelected(getLocale());
  }, []);

  function handleSave() {
    setLocale(selected);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const locales = getAvailableLocales();

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
              {t("settings")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {t("language")}
            </h1>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Language Selection */}
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">
            {t("language")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Select your preferred language for the application interface.
          </p>

          <div className="mt-6 space-y-3">
            {locales.map((locale) => (
              <label
                key={locale.code}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                  selected === locale.code
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-white/10 bg-slate-950/70 hover:bg-slate-900/70"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={locale.code}
                  checked={selected === locale.code}
                  onChange={() => {
                    setSelected(locale.code);
                    setSaved(false);
                  }}
                  className="accent-cyan-400"
                />
                <span className="text-2xl">
                  {locale.code === "en" ? "\u{1F1EC}\u{1F1E7}" : "\u{1F1EE}\u{1F1F3}"}
                </span>
                <div>
                  <p className="font-medium text-white">{locale.name}</p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {locale.code === "en"
                      ? "English"
                      : "Hindi (हिन्दी)"}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {saved && (
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              Language preference saved successfully.
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="mt-6 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            {t("save")}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">Preview</h2>
            <p className="mt-1 text-sm text-slate-400">
              Sample translations in{" "}
              <span className="text-cyan-300">{getLocaleName(selected)}</span>
            </p>

            <div className="mt-4 space-y-2">
              {previewKeys.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/50 px-4 py-2.5"
                >
                  <span className="text-xs text-slate-500">{key}</span>
                  <span className="text-sm text-white">
                    {mounted ? t(key, selected) : key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">About</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              BizzBills supports English and Hindi to serve businesses across
              India. Your language preference is saved locally and applies
              immediately across the application.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

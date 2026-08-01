"use client";

import { useState, useEffect, useCallback } from "react";

type CustomField = {
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
};

type BrandingSettings = {
  primaryColor: string;
  fontFamily: string;
  poweredByBizzBills: boolean;
  customFields: CustomField[];
};

const FONT_OPTIONS = [
  { name: "Inter", value: "Inter" },
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Lato", value: "Lato" },
  { name: "Poppins", value: "Poppins" },
  { name: "Montserrat", value: "Montserrat" },
  { name: "Source Sans Pro", value: "Source Sans Pro" },
  { name: "Nunito", value: "Nunito" },
];

const DEFAULT_FIELDS: CustomField[] = [];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function BrandingSettingsPage() {
  const [settings, setSettings] = useState<BrandingSettings>({
    primaryColor: "#06b6d4",
    fontFamily: "Inter",
    poweredByBizzBills: true,
    customFields: DEFAULT_FIELDS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data) => {
        let customFields = DEFAULT_FIELDS;
        try {
          customFields = JSON.parse(data.customFields || "[]");
        } catch {
          customFields = DEFAULT_FIELDS;
        }

        setSettings({
          primaryColor: data.primaryColor || "#06b6d4",
          fontFamily: data.fontFamily || "Inter",
          poweredByBizzBills: data.poweredByBizzBills !== false,
          customFields,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateColor = useCallback((color: string) => {
    setSettings((prev) => ({ ...prev, primaryColor: color }));
    setSaved(false);
  }, []);

  const updateFont = useCallback((font: string) => {
    setSettings((prev) => ({ ...prev, fontFamily: font }));
    setSaved(false);
  }, []);

  const togglePoweredBy = useCallback(() => {
    setSettings((prev) => ({ ...prev, poweredByBizzBills: !prev.poweredByBizzBills }));
    setSaved(false);
  }, []);

  const addCustomField = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { id: generateId(), label: "", placeholder: "", required: false },
      ],
    }));
    setSaved(false);
  }, []);

  const updateCustomField = useCallback(
    (id: string, updates: Partial<CustomField>) => {
      setSettings((prev) => ({
        ...prev,
        customFields: prev.customFields.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      }));
      setSaved(false);
    },
    []
  );

  const removeCustomField = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((f) => f.id !== id),
    }));
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor: settings.primaryColor,
          fontFamily: settings.fontFamily,
          poweredByBizzBills: settings.poweredByBizzBills,
          customFields: JSON.stringify(settings.customFields),
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center pb-10">
        <p className="text-muted">Loading branding settings…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Page Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-default">Branding & White-Label</h1>
            <p className="mt-1 text-sm text-muted">
              Customize your brand identity, fonts, and invoice appearance across your organization.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Primary Color */}
          <div className="section-card">
            <h2 className="section-label">Primary Brand Color</h2>
            <p className="mb-4 text-sm text-muted">
              This color will be used across invoices, reports, and your dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "Cyan", value: "#06b6d4" },
                { name: "Blue", value: "#2563eb" },
                { name: "Indigo", value: "#4f46e5" },
                { name: "Purple", value: "#7c3aed" },
                { name: "Pink", value: "#ec4899" },
                { name: "Rose", value: "#f43f5e" },
                { name: "Red", value: "#dc2626" },
                { name: "Orange", value: "#ea580c" },
                { name: "Amber", value: "#d97706" },
                { name: "Green", value: "#16a34a" },
                { name: "Emerald", value: "#059669" },
                { name: "Teal", value: "#0d9488" },
              ].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateColor(c.value)}
                  title={c.name}
                  className={`h-10 w-10 rounded-full border-2 transition-all duration-150 ${
                    settings.primaryColor === c.value
                      ? "scale-110 border-white shadow-lg"
                      : "border-transparent hover:scale-105 hover:border-white/40"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
              <label
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-white/20 text-sm text-slate-400 transition hover:border-white/40 hover:text-white"
                title="Custom color"
              >
                🎨
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => updateColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-muted">Selected:</span>
              <span
                className="inline-block h-6 w-6 rounded-full border border-white/20"
                style={{ backgroundColor: settings.primaryColor }}
              />
              <span className="font-mono text-sm text-default">{settings.primaryColor}</span>
            </div>
          </div>

          {/* Font Family */}
          <div className="section-card">
            <h2 className="section-label">Invoice Font</h2>
            <p className="mb-4 text-sm text-muted">
              Choose the font family for your invoice documents.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateFont(f.value)}
                  className={`rounded-xl border p-3 text-left transition-all duration-200 ${
                    settings.fontFamily === f.value
                      ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                      : "border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/70"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      settings.fontFamily === f.value ? "text-cyan-200" : "text-white"
                    }`}
                    style={{ fontFamily: f.value }}
                  >
                    {f.name}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">Aa Bb Cc</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Fields */}
          <div className="section-card">
            <h2 className="section-label">Custom Invoice Fields</h2>
            <p className="mb-4 text-sm text-muted">
              Add up to 5 custom fields that appear on your invoices (e.g., PO Number, Project Name).
            </p>

            <div className="space-y-3">
              {settings.customFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex flex-col gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-4 sm:flex-row sm:items-center"
                >
                  <span className="text-sm font-medium text-muted">#{idx + 1}</span>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                    placeholder="Field label (e.g., PO Number)"
                    className="input flex-1"
                    maxLength={30}
                  />
                  <input
                    type="text"
                    value={field.placeholder}
                    onChange={(e) => updateCustomField(field.id, { placeholder: e.target.value })}
                    placeholder="Placeholder text"
                    className="input flex-1"
                    maxLength={50}
                  />
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        updateCustomField(field.id, { required: e.target.checked })
                      }
                      className="rounded"
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCustomField(field.id)}
                    className="text-danger hover:text-danger/80 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {settings.customFields.length < 5 && (
                <button
                  type="button"
                  onClick={addCustomField}
                  className="w-full rounded-xl border border-dashed border-white/20 p-3 text-sm text-muted transition hover:border-white/40 hover:text-white"
                >
                  + Add Custom Field ({settings.customFields.length}/5)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Powered by BizzBills */}
          <div className="section-card">
            <h2 className="section-label">White-Label Options</h2>
            <p className="mb-4 text-sm text-muted">
              Control branding visibility on your invoices and documents.
            </p>

            <label
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                settings.poweredByBizzBills
                  ? "border-[var(--card-border)] bg-[var(--badge-bg)] hover:border-accent/30"
                  : "border-accent/30 bg-accent/5 hover:border-accent/50"
              }`}
            >
              <div>
                <p className="font-medium text-default">&quot;Powered by BizzBills&quot; Badge</p>
                <p className="text-xs text-muted">
                  {settings.poweredByBizzBills
                    ? "Shown on invoices and documents"
                    : "Hidden — your brand only (paid plans)"}
                </p>
              </div>
              <div className="relative ml-4 shrink-0">
                <input
                  type="checkbox"
                  checked={settings.poweredByBizzBills}
                  onChange={togglePoweredBy}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-[var(--input-border)] transition peer-checked:bg-accent" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          {/* Preview */}
          <div className="section-card">
            <h2 className="section-label">Live Preview</h2>
            <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-lg"
                  style={{ backgroundColor: settings.primaryColor }}
                />
                <div>
                  <p
                    className="font-semibold text-white"
                    style={{ fontFamily: settings.fontFamily }}
                  >
                    Your Company Name
                  </p>
                  <p className="text-xs text-slate-400" style={{ fontFamily: settings.fontFamily }}>
                    GST Invoice #001
                  </p>
                </div>
              </div>
              <div
                className="rounded-lg p-3 text-sm"
                style={{
                  backgroundColor: `${settings.primaryColor}15`,
                  borderLeft: `3px solid ${settings.primaryColor}`,
                  fontFamily: settings.fontFamily,
                }}
              >
                <p className="text-white font-medium">Invoice Preview</p>
                <p className="text-slate-300 text-xs mt-1">
                  This shows how your invoices will look with the selected branding.
                </p>
              </div>
              {settings.poweredByBizzBills && (
                <p className="mt-3 text-center text-[10px] text-slate-500">
                  Powered by BizzBills
                </p>
              )}
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="section-card">
            <h2 className="section-label">Current Configuration</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Primary Color</span>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-[var(--card-border)]"
                    style={{ backgroundColor: settings.primaryColor }}
                  />
                  <span className="font-medium text-default">{settings.primaryColor}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Font Family</span>
                <span className="font-medium text-default">{settings.fontFamily}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Powered By Badge</span>
                <span
                  className={`font-medium ${
                    settings.poweredByBizzBills ? "text-success" : "text-danger"
                  }`}
                >
                  {settings.poweredByBizzBills ? "Visible" : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Custom Fields</span>
                <span className="font-medium text-default">
                  {settings.customFields.length}/5
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Branding Settings"}
          </button>

          {saved && (
            <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success">
              Branding settings saved successfully. Changes will apply to new invoices.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

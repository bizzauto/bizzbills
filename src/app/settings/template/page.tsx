"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TemplateSelector,
  type TemplateId,
  ACCENT_COLORS,
} from "@/components/invoice/InvoiceTemplates";

type TemplateSettings = {
  defaultTemplate: TemplateId;
  defaultAccentColor: string;
  invoiceTitle: string;
  footerNotes: string;
  showBankDetails: boolean;
  showGstin: boolean;
  showSignature: boolean;
  showQrCode: boolean;
  // Bank details — saved once here (or on first invoice) and pre-filled everywhere.
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
};

const DEFAULTS: TemplateSettings = {
  defaultTemplate: "classic",
  defaultAccentColor: "#06b6d4",
  invoiceTitle: "Tax Invoice",
  footerNotes: "Payment due within 7 days. Thank you for your business.",
  showBankDetails: true,
  showGstin: true,
  showSignature: true,
  showQrCode: false,
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
};

const HEADER_PRESETS = ["Tax Invoice", "Invoice", "Bill", "Tax Bill", "Proforma Invoice"];

export default function TemplateSettingsPage() {
  const [settings, setSettings] = useState<TemplateSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          defaultTemplate: data.defaultTemplate || DEFAULTS.defaultTemplate,
          defaultAccentColor: data.defaultAccentColor || DEFAULTS.defaultAccentColor,
          invoiceTitle: data.invoiceTitle || DEFAULTS.invoiceTitle,
          footerNotes: data.footerNotes || DEFAULTS.footerNotes,
          showBankDetails: data.showBankDetails !== false,
          showGstin: data.showGstin !== false,
          showSignature: data.showSignature !== false,
          showQrCode: data.showQrCode === true,
          bankName: data.bankName || "",
          accountName: data.accountName || "",
          accountNumber: data.accountNumber || "",
          ifscCode: data.ifscCode || "",
          upiId: data.upiId || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(<K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center pb-10">
        <p className="text-muted">Loading template settings…</p>
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
            <h1 className="mt-2 text-3xl font-semibold text-default">Template Settings</h1>
            <p className="mt-1 text-sm text-muted">
              Configure your default invoice template, branding, and visibility options.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Template Selector */}
          <div className="section-card">
            <h2 className="section-label">Default Template</h2>
            <p className="mb-4 text-sm text-muted">
              Choose a layout for your invoices. This will be pre-selected when creating new invoices.
            </p>
            <TemplateSelector
              selected={settings.defaultTemplate}
              accentColor={settings.defaultAccentColor}
              onChange={(id) => update("defaultTemplate", id)}
              onColorChange={(color) => update("defaultAccentColor", color)}
            />
          </div>

          {/* Invoice Header */}
          <div className="section-card">
            <h2 className="section-label">Invoice Header</h2>
            <p className="mb-4 text-sm text-muted">
              Customize the title text that appears at the top of your invoices.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {HEADER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => update("invoiceTitle", preset)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    settings.invoiceTitle === preset
                      ? "bg-accent text-slate-900"
                      : "border border-[var(--card-border)] bg-[var(--badge-bg)] text-default hover:border-accent/40"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <label className="block text-sm text-default">
              <span className="mb-1 text-muted">Custom title</span>
              <input
                type="text"
                value={settings.invoiceTitle}
                onChange={(e) => update("invoiceTitle", e.target.value)}
                className="input mt-1"
                placeholder="Tax Invoice"
              />
            </label>
          </div>

          {/* Footer Notes */}
          <div className="section-card">
            <h2 className="section-label">Footer Notes / Terms</h2>
            <p className="mb-4 text-sm text-muted">
              Default notes or terms that appear at the bottom of every invoice.
            </p>
            <textarea
              value={settings.footerNotes}
              onChange={(e) => update("footerNotes", e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Payment due within 7 days. Thank you for your business."
            />
          </div>

          {/* Bank Details */}
          <div className="section-card">
            <h2 className="section-label">Bank Details</h2>
            <p className="mb-4 text-sm text-muted">
              Saved once and pre-filled on every invoice. You can also edit these when creating an invoice.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-muted">
                Bank Name
                <input
                  value={settings.bankName}
                  onChange={(e) => update("bankName", e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="State Bank of India"
                />
              </label>
              <label className="text-sm text-muted">
                Account Name
                <input
                  value={settings.accountName}
                  onChange={(e) => update("accountName", e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="Your Business Name"
                />
              </label>
              <label className="text-sm text-muted">
                Account Number
                <input
                  value={settings.accountNumber}
                  onChange={(e) => update("accountNumber", e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="XXXXXXXXXXX"
                />
              </label>
              <label className="text-sm text-muted">
                IFSC Code
                <input
                  value={settings.ifscCode}
                  onChange={(e) => update("ifscCode", e.target.value.toUpperCase())}
                  className="input mt-1 w-full"
                  placeholder="SBIN0001234"
                />
              </label>
              <label className="text-sm text-muted md:col-span-2">
                UPI ID
                <input
                  value={settings.upiId}
                  onChange={(e) => update("upiId", e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="name@upi"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Visibility Toggles */}
          <div className="section-card">
            <h2 className="section-label">Visibility Options</h2>
            <p className="mb-4 text-sm text-muted">
              Choose what to show on your invoices.
            </p>

            <div className="space-y-3">
              {([
                { key: "showGstin", label: "Show GSTIN", desc: "Display GSTIN on the invoice" },
                { key: "showBankDetails", label: "Show Bank Details", desc: "Display bank account information for payments" },
                { key: "showSignature", label: "Show Signature Line", desc: "Include an authorized signatory line" },
                { key: "showQrCode", label: "Show QR Code", desc: "Display a QR code for quick payment" },
              ] as const).map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-4 transition hover:border-accent/30"
                >
                  <div>
                    <p className="font-medium text-default">{label}</p>
                    <p className="text-xs text-muted">{desc}</p>
                  </div>
                  <div className="relative ml-4 shrink-0">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => update(key, e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-[var(--input-border)] transition peer-checked:bg-accent" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Preview Info */}
          <div className="section-card">
            <h2 className="section-label">Current Configuration</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Template</span>
                <span className="font-medium text-default capitalize">{settings.defaultTemplate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Accent Color</span>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-[var(--card-border)]"
                    style={{ backgroundColor: settings.defaultAccentColor }}
                  />
                  <span className="font-medium text-default">{settings.defaultAccentColor}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Header</span>
                <span className="font-medium text-default">{settings.invoiceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Bank Details</span>
                <span className={`font-medium ${settings.showBankDetails ? "text-success" : "text-danger"}`}>
                  {settings.showBankDetails ? "Visible" : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">GSTIN</span>
                <span className={`font-medium ${settings.showGstin ? "text-success" : "text-danger"}`}>
                  {settings.showGstin ? "Visible" : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Signature</span>
                <span className={`font-medium ${settings.showSignature ? "text-success" : "text-danger"}`}>
                  {settings.showSignature ? "Visible" : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">QR Code</span>
                <span className={`font-medium ${settings.showQrCode ? "text-success" : "text-danger"}`}>
                  {settings.showQrCode ? "Visible" : "Hidden"}
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
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Template Settings"}
          </button>

          {saved && (
            <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success">
              Template settings saved successfully. New invoices will use these defaults.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

type ImportResult = {
  entity: string;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; field: string; message: string; value: unknown }[];
  totalRows: number;
  message?: string;
};

type TallyFormat = "vouchers" | "ledger" | "gstr1";

export default function ImportExportPage() {
  const [tab, setTab] = useState<"export" | "import" | "tally" | "share">("export");
  const [entity, setEntity] = useState("products");
  const [exportData, setExportData] = useState<{ headers: string[]; rows: Record<string, string | number>[] } | null>(null);
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  // Tally export
  const [tallyFormat, setTallyFormat] = useState<TallyFormat>("vouchers");
  const [tallyFrom, setTallyFrom] = useState("2024-01-01");
  const [tallyTo, setTallyTo] = useState(new Date().toISOString().split("T")[0]);
  const [tallyData, setTallyData] = useState<Record<string, unknown> | null>(null);
  const [tallyLoading, setTallyLoading] = useState(false);

  // WhatsApp share
  const [sharePhone, setSharePhone] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareResult, setShareResult] = useState<{ url: string; message: string } | null>(null);

  // ── CSV Export ──
  async function handleExport() {
    const res = await fetch(`/api/export?entity=${entity}`);
    const data = await res.json();
    setExportData(data);
  }

  function downloadCsv() {
    if (!exportData) return;
    const header = exportData.headers.join(",");
    const body = exportData.rows.map((r) => exportData.headers.map((h) => `"${String(r[h] ?? "")}"`).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${entity}_export.csv`;
    a.click();
  }

  // ── CSV Import ──
  async function handleImport() {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return;
    setImporting(true);
    setImportResult(null);
    try {
      const headers = lines[0].split(",").map((h) => h.replace(/^"+|"+$/g, "").trim());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.replace(/^"+|"+$/g, "").trim());
        return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i] || "" }), {} as Record<string, string>);
      });
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, rows }),
      });
      const data = await res.json();
      setImportResult(data);
    } catch {
      setImportResult({ entity, created: 0, updated: 0, skipped: 0, errors: [{ row: 0, field: "general", message: "Network error", value: null }], totalRows: 0 });
    } finally {
      setImporting(false);
    }
  }

  // ── Tally Export ──
  async function handleTallyExport() {
    setTallyLoading(true);
    try {
      const res = await fetch(`/api/export/tally?format=${tallyFormat}&fromDate=${tallyFrom}&toDate=${tallyTo}`);
      const data = await res.json();
      setTallyData(data as Record<string, unknown>);
    } catch {
      /* silent */
    } finally {
      setTallyLoading(false);
    }
  }

  function downloadTallyJson() {
    if (!tallyData) return;
    const blob = new Blob([JSON.stringify(tallyData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tally_${tallyFormat}_${tallyTo}.json`;
    a.click();
  }

  // ── WhatsApp Share ──
  async function handleWhatsAppShare() {
    if (!shareMessage.trim()) return;
    try {
      const res = await fetch("/api/share/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: sharePhone, message: shareMessage }),
      });
      const data = await res.json();
      setShareResult(data);
    } catch {
      /* silent */
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Import / Export</h1>
            <p className="text-sm text-slate-400">Bulk data operations, Tally integration, and sharing</p>
          </div>
          <Link href="/settings" className="text-xs text-cyan-400 hover:underline">&larr; Settings</Link>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2">
          {(["export", "import", "tally", "share"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              {t === "tally" ? "Tally Export" : t === "share" ? "WhatsApp Share" : t}
            </button>
          ))}
        </div>

        {/* ── CSV Export Tab ── */}
        {tab === "export" && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">CSV Export</h2>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-slate-400">Entity</label>
              <select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
                <option value="products">Products</option>
                <option value="parties">Parties</option>
                <option value="chart_of_accounts">Chart of Accounts</option>
                <option value="invoices">Invoices</option>
              </select>
            </div>
            <button onClick={handleExport} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">Preview Export</button>
            {exportData && (
              <div className="mt-4">
                <div className="mb-2 text-xs text-slate-400">{exportData.rows.length} records</div>
                <div className="max-h-40 overflow-auto rounded bg-slate-900 p-2 text-xs font-mono">
                  {exportData.headers.join(", ")}
                  {exportData.rows.slice(0, 5).map((r, i) => <div key={i}>{exportData.headers.map((h) => r[h]).join(", ")}</div>)}
                </div>
                <button onClick={downloadCsv} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Download CSV</button>
              </div>
            )}
          </div>
        )}

        {/* ── CSV Import Tab ── */}
        {tab === "import" && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Import CSV</h2>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-slate-400">Entity</label>
              <select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
                <option value="products">Products</option>
                <option value="parties">Parties</option>
                <option value="chart_of_accounts">Chart of Accounts</option>
              </select>
            </div>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6}
              className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white"
              placeholder="Paste CSV data (header row + data rows)&#10;Example: name,sku,sellingPrice&#10;Widget,W001,199.99" />
            <button onClick={handleImport} disabled={importing}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50">
              {importing ? "Importing…" : "Import"}
            </button>

            {importResult && (
              <div className="mt-4 space-y-2">
                <div className="flex gap-3 text-sm">
                  {importResult.created > 0 && <span className="text-emerald-400">✓ {importResult.created} created</span>}
                  {importResult.updated > 0 && <span className="text-amber-400">↻ {importResult.updated} updated</span>}
                  {importResult.skipped > 0 && <span className="text-red-400">✗ {importResult.skipped} skipped</span>}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-auto rounded bg-red-900/20 border border-red-800 p-2 text-xs">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="text-red-300">
                        Row {e.row}: <span className="text-red-400">{e.field}</span> — {e.message}
                        {e.value != null && <span className="text-slate-500"> (got: {String(e.value)})</span>}
                      </div>
                    ))}
                  </div>
                )}
                {importResult.message && <p className="text-sm text-amber-400">{importResult.message}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── Tally Export Tab ── */}
        {tab === "tally" && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-1 text-lg font-semibold text-white">Tally-Compatible Export</h2>
            <p className="mb-4 text-xs text-slate-400">Export data in Tally-importable JSON format for seamless migration.</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Format</label>
                <select value={tallyFormat} onChange={(e) => setTallyFormat(e.target.value as TallyFormat)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
                  <option value="vouchers">Sales Vouchers</option>
                  <option value="ledger">Ledger Entries</option>
                  <option value="gstr1">GSTR-1 Report</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">From</label>
                <input type="date" value={tallyFrom} onChange={(e) => setTallyFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">To</label>
                <input type="date" value={tallyTo} onChange={(e) => setTallyTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
              </div>
            </div>

            <button onClick={handleTallyExport} disabled={tallyLoading}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50">
              {tallyLoading ? "Exporting…" : "Export for Tally"}
            </button>

            {tallyData && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Preview (first 500 chars)</span>
                  <button onClick={downloadTallyJson} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">Download JSON</button>
                </div>
                <pre className="max-h-40 overflow-auto rounded bg-slate-900 p-2 text-xs font-mono text-slate-300">
                  {JSON.stringify(tallyData, null, 2).slice(0, 500)}…
                </pre>
              </div>
            )}

            <div className="mt-4 rounded bg-slate-900/50 p-3 text-xs text-slate-400">
              <p className="font-medium text-slate-300 mb-1">How to import into Tally:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the JSON file from above</li>
                <li>Open Tally → Import → Data → JSON</li>
                <li>Select the downloaded file</li>
                <li>Map the fields to your Tally ledger accounts</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── WhatsApp Share Tab ── */}
        {tab === "share" && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h2 className="mb-1 text-lg font-semibold text-white">WhatsApp Share</h2>
            <p className="mb-4 text-xs text-slate-400">Generate a WhatsApp share link with pre-filled message.</p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Phone Number (with country code)</label>
                <input type="tel" value={sharePhone} onChange={(e) => setSharePhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  placeholder="919876543210" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Message</label>
                <textarea value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} rows={5}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white"
                  placeholder="📋 Invoice #INV-001&#10;Amount: ₹1,500&#10;Due: 2024-12-31" />
              </div>
              <button onClick={handleWhatsAppShare}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                Generate WhatsApp Link
              </button>
            </div>

            {shareResult && (
              <div className="mt-4 space-y-2">
                <a href={shareResult.url} target="_blank" rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">
                  Open in WhatsApp →
                </a>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Preview:</p>
                  <pre className="max-h-32 overflow-auto rounded bg-slate-900 p-2 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {shareResult.message}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

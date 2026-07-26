"use client";

import { useState } from "react";
import Link from "next/link";

export default function ImportExportPage() {
  const [entity, setEntity] = useState("products");
  const [exportData, setExportData] = useState<{ headers: string[]; rows: Record<string, string | number>[] } | null>(null);
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<{ created: number; entity: string } | null>(null);

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

  async function handleImport() {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return;
    const headers = lines[0].split(",").map((h) => h.replace(/^"+|"+$/g, "").trim());
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.replace(/^"+|"+$/g, "").trim());
      return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i] || "" }), {} as Record<string, string>);
    });
    const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, rows }) });
    const data = await res.json();
    setImportResult(data);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Import / Export</h1>
            <p className="text-sm text-slate-400">Bulk data operations</p>
          </div>
          <Link href="/settings" className="text-xs text-cyan-400 hover:underline">&larr; Settings</Link>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-400">Entity</label>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="products">Products</option>
            <option value="parties">Parties</option>
            <option value="chart_of_accounts">Chart of Accounts</option>
            <option value="invoices">Invoices</option>
          </select>
        </div>

        <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Export</h2>
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

        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Import CSV</h2>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white" placeholder="Paste CSV data (header row + data rows)" />
          <button onClick={handleImport} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">Import</button>
          {importResult && <p className="mt-3 text-sm text-emerald-400">Imported {importResult.created} {importResult.entity}.</p>}
        </div>
      </div>
    </div>
  );
}

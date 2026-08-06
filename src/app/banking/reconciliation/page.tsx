"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

/* ── Types ── */
type BankEntry = {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
};

type MatchedTxn = {
  bankEntry: BankEntry;
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string | null;
    invoiceNumber: string | null;
    customerName: string | null;
  };
  dateDiff: number;
  confidence: "high" | "medium" | "low";
};

type UnmatchedTxn = {
  bankEntry: BankEntry;
  reason: string;
};

type ReconciliationResult = {
  matched: MatchedTxn[];
  unmatched: UnmatchedTxn[];
  summary: {
    totalEntries: number;
    matchedCount: number;
    unmatchedCount: number;
    matchedTotal: number;
    unmatchedTotal: number;
  };
};

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  currentBalance: number;
};

/* ── CSV Parser ── */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText: string): BankEntry[] {
  const lines = csvText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = parseCSVLine(header);

  const dateIdx = cols.findIndex((c) =>
    /date|trans.?date|txn.?date|value.?date/i.test(c)
  );
  const descIdx = cols.findIndex((c) =>
    /desc|narration|particular|detail|memo|reference/i.test(c)
  );
  const debitIdx = cols.findIndex((c) =>
    /debit|withdrawal|dr|debit.?amt/i.test(c)
  );
  const creditIdx = cols.findIndex((c) =>
    /credit|deposit|cr|credit.?amt/i.test(c)
  );
  const amountIdx = cols.findIndex(
    (c) => /amount|amt|txn.?amt/i.test(c) && !/debit|credit/i.test(c)
  );

  const entries: BankEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const dateStr = dateIdx >= 0 ? values[dateIdx] : values[0];
    const description =
      descIdx >= 0 ? values[descIdx] : values[1] || "Unknown";

    let amount = 0;
    let type: "credit" | "debit" = "debit";

    if (debitIdx >= 0 && creditIdx >= 0) {
      const debitVal = parseFloat(
        values[debitIdx]?.replace(/[,]/g, "") || "0"
      );
      const creditVal = parseFloat(
        values[creditIdx]?.replace(/[,]/g, "") || "0"
      );
      if (creditVal > 0) {
        amount = creditVal;
        type = "credit";
      } else if (debitVal > 0) {
        amount = debitVal;
        type = "debit";
      }
    } else if (amountIdx >= 0) {
      const rawAmount = parseFloat(
        values[amountIdx]?.replace(/[,]/g, "") || "0"
      );
      amount = Math.abs(rawAmount);
      type = rawAmount >= 0 ? "credit" : "debit";
    }

    if (amount > 0 && dateStr) {
      entries.push({ date: dateStr, description, amount, type });
    }
  }

  return entries;
}

function formatEntryDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {
    /* fall through */
  }
  return dateStr;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-300",
  medium: "bg-amber-500/10 text-amber-300",
  low: "bg-slate-500/10 text-slate-400",
};

export default function ReconciliationPage() {
  const { currentOrgCurrency } = useOrg();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((d) => {
        const list = d?.accounts ?? [];
        setAccounts(list);
        if (list.length === 1) setSelectedAccountId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setSaved(false);

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a CSV file");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError(
          "No valid transactions found. Ensure the CSV has date, description, and amount columns."
        );
        return;
      }
      setEntries(parsed);
    } catch {
      setError("Failed to parse CSV file. Check the format and try again.");
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const runReconciliation = useCallback(async () => {
    if (entries.length === 0) return;
    if (!selectedAccountId) {
      setError("Please select a bank account first");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const response = await fetch("/api/banking/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, bankAccountId: selectedAccountId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Reconciliation failed");
      }

      const data: ReconciliationResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsProcessing(false);
    }
  }, [entries, selectedAccountId]);

  const clearAll = useCallback(() => {
    setEntries([]);
    setResult(null);
    setError(null);
    setSaved(false);
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">
              <Link
                href="/banking"
                className="hover:text-cyan-300"
              >
                Banking
              </Link>{" "}
              / Reconciliation
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-default">
              Bank Reconciliation
            </h1>
          </div>
          {entries.length > 0 && (
            <button onClick={clearAll} className="btn-secondary">
              Start Over
            </button>
          )}
        </div>
      </section>

      {/* KPI Summary */}
      {result?.summary && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="kpi-card kpi-accent-cyan">
            <p className="text-muted text-xs">Total Entries</p>
            <p className="text-default mt-1 text-2xl font-semibold">
              {result.summary.totalEntries}
            </p>
          </div>
          <div className="kpi-card kpi-accent-green">
            <p className="text-muted text-xs">Matched</p>
            <p className="text-success mt-1 text-2xl font-semibold">
              {result.summary.matchedCount}
            </p>
          </div>
          <div className="kpi-card kpi-accent-amber">
            <p className="text-muted text-xs">Unmatched</p>
            <p className="text-warning mt-1 text-2xl font-semibold">
              {result.summary.unmatchedCount}
            </p>
          </div>
          <div className="kpi-card kpi-accent-purple">
            <p className="text-muted text-xs">Reconciled Amount</p>
            <p className="text-success mt-1 text-2xl font-semibold">
              {formatAmount(result.summary.matchedTotal, currentOrgCurrency)}
            </p>
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <div className="section-card flex items-center gap-3 border border-red-500/20 bg-red-500/10 p-4">
          <span className="text-lg text-red-400">!</span>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Bank Account Selector + Upload Zone */}
      {entries.length === 0 && !result && (
        <>
          {/* Account selector */}
          <section className="section-card">
            <label className="text-muted mb-2 block text-xs">
              Select Bank Account *
            </label>
            {accounts.length === 0 ? (
              <div className="flex items-center gap-3">
                <p className="text-muted text-sm">No bank accounts found.</p>
                <Link
                  href="/banking"
                  className="text-cyan-300 text-sm hover:underline"
                >
                  Create one →
                </Link>
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="input-field w-full max-w-md"
              >
                <option value="">— Choose account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.bankName ? ` (${a.bankName})` : ""} — Balance:{" "}
                    {formatAmount(a.currentBalance, currentOrgCurrency)}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Upload Zone */}
          <section
            className={`section-card flex flex-col items-center justify-center border-2 border-dashed py-16 transition-colors ${
              isDragOver
                ? "border-cyan-400 bg-cyan-500/5"
                : "border-white/10"
            } ${!selectedAccountId ? "opacity-50" : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
          >
            <div className="text-center">
              <div className="text-muted mb-4 text-5xl">⬆</div>
              <p className="text-default text-lg font-medium">
                Drop your bank statement CSV here
              </p>
              <p className="text-muted mt-1 text-sm">
                or click to browse files
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary mt-6"
                disabled={!selectedAccountId}
              >
                Choose CSV File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </section>
        </>
      )}

      {/* Parsed Entries Preview */}
      {entries.length > 0 && !result && (
        <section className="section-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-default text-lg font-semibold">
                Parsed Entries
              </h2>
              <p className="text-muted text-sm">
                {entries.length} transaction{entries.length !== 1 ? "s" : ""}{" "}
                from{" "}
                <span className="text-cyan-300 font-medium">
                  {selectedAccount?.name ?? "account"}
                </span>
                . Review before reconciling.
              </p>
            </div>
            <button
              onClick={runReconciliation}
              disabled={isProcessing}
              className="btn-primary"
            >
              {isProcessing ? "Reconciling…" : "Run Reconciliation"}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-default text-muted">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium text-right">Amount</th>
                  <th className="p-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-default hover:bg-card-hover"
                  >
                    <td className="p-3 text-default">
                      {formatEntryDate(entry.date)}
                    </td>
                    <td className="p-3 text-default">{entry.description}</td>
                    <td className="p-3 text-right font-medium text-default">
                      {formatAmount(entry.amount, currentOrgCurrency)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`badge ${
                          entry.type === "credit"
                            ? "badge-completed"
                            : "badge-overdue"
                        }`}
                      >
                        {entry.type === "credit" ? "Credit" : "Debit"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Results: Matched + Unmatched side by side */}
      {result && (
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Matched */}
          <div className="section-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-success text-lg font-semibold">
                Matched ({result.matched.length})
              </h2>
              <span className="badge badge-completed">
                {formatAmount(result.summary.matchedTotal, currentOrgCurrency)}
              </span>
            </div>
            {result.matched.length === 0 ? (
              <p className="text-muted py-8 text-center text-sm">
                No matching payments found.
              </p>
            ) : (
              <div className="max-h-[500px] space-y-3 overflow-y-auto">
                {result.matched.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-default text-sm font-medium">
                          {m.bankEntry.description}
                        </p>
                        <p className="text-muted mt-0.5 text-xs">
                          {formatEntryDate(m.bankEntry.date)}
                          {m.dateDiff === 0
                            ? " (same day)"
                            : ` (${m.dateDiff}d off)`}
                        </p>
                        <p className="text-muted mt-1 text-xs">
                          → Payment #{m.payment.id.slice(0, 8)}
                          {m.payment.invoiceNumber &&
                            ` / Inv #${m.payment.invoiceNumber}`}
                          {m.payment.customerName &&
                            ` (${m.payment.customerName})`}
                        </p>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-success text-sm font-semibold">
                          {formatAmount(
                            m.bankEntry.amount,
                            currentOrgCurrency
                          )}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${CONFIDENCE_COLORS[m.confidence]}`}
                        >
                          {m.confidence}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unmatched */}
          <div className="section-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-warning text-lg font-semibold">
                Unmatched ({result.unmatched.length})
              </h2>
              <span className="badge badge-pending">
                {formatAmount(
                  result.summary.unmatchedTotal,
                  currentOrgCurrency
                )}
              </span>
            </div>
            {result.unmatched.length === 0 ? (
              <p className="text-muted py-8 text-center text-sm">
                All transactions matched. Fully reconciled.
              </p>
            ) : (
              <div className="max-h-[500px] space-y-3 overflow-y-auto">
                {result.unmatched.map((u, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-default text-sm font-medium">
                          {u.bankEntry.description}
                        </p>
                        <p className="text-muted mt-0.5 text-xs">
                          {formatEntryDate(u.bankEntry.date)}
                        </p>
                        <p className="text-red-400 mt-1 text-xs">{u.reason}</p>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-warning text-sm font-semibold">
                          {formatAmount(
                            u.bankEntry.amount,
                            currentOrgCurrency
                          )}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            u.bankEntry.type === "credit"
                              ? "badge-completed"
                              : "badge-overdue"
                          }`}
                        >
                          {u.bankEntry.type === "credit" ? "CR" : "DR"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Summary Bar */}
      {result && (
        <section className="section-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-muted text-xs">Reconciled</p>
                <p className="text-success text-lg font-semibold">
                  {formatAmount(
                    result.summary.matchedTotal,
                    currentOrgCurrency
                  )}
                </p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-muted text-xs">Unreconciled</p>
                <p className="text-warning text-lg font-semibold">
                  {formatAmount(
                    result.summary.unmatchedTotal,
                    currentOrgCurrency
                  )}
                </p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-muted text-xs">Match Rate</p>
                <p className="text-default text-lg font-semibold">
                  {result.summary.totalEntries > 0
                    ? Math.round(
                        (result.summary.matchedCount /
                          result.summary.totalEntries) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {saved && (
                <span className="badge badge-completed mr-2">
                  ✓ Saved to ledger
                </span>
              )}
              <button onClick={clearAll} className="btn-secondary">
                Upload New Statement
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

/* ── Types ── */
type BankAccount = {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branch: string;
  type: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  _count: { transactions: number };
};

type AccountForm = {
  name: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branch: string;
  type: string;
  openingBalance: string;
};

const EMPTY_FORM: AccountForm = {
  name: "",
  accountNumber: "",
  bankName: "",
  ifscCode: "",
  branch: "",
  type: "savings",
  openingBalance: "",
};

const ACCOUNT_TYPES = [
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
];

function formatAcctNumber(num: string): string {
  if (!num) return "—";
  if (num.length <= 4) return num;
  return "••••" + num.slice(-4);
}

export default function BankingPage() {
  const { currentOrgCurrency } = useOrg();
  const [tab, setTab] = useState("accounts");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/bank-accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const activeCount = accounts.filter((a) => a.isActive).length;
  const totalTransactions = accounts.reduce(
    (s, a) => s + a._count.transactions,
    0
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((acct: BankAccount) => {
    setEditingId(acct.id);
    setForm({
      name: acct.name,
      accountNumber: acct.accountNumber,
      bankName: acct.bankName,
      ifscCode: acct.ifscCode,
      branch: acct.branch,
      type: acct.type,
      openingBalance: String(acct.openingBalance),
    });
    setError(null);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim()) {
        setError("Account name is required");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const url = editingId
          ? `/api/bank-accounts/${editingId}`
          : "/api/bank-accounts";
        const method = editingId ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            openingBalance: parseFloat(form.openingBalance) || 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to save");
          return;
        }
        closeForm();
        fetchAccounts();
      } catch {
        setError("Network error — try again");
      } finally {
        setSaving(false);
      }
    },
    [form, editingId, closeForm, fetchAccounts]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this bank account?")) return;
      try {
        const res = await fetch(`/api/bank-accounts/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Cannot delete");
          return;
        }
        fetchAccounts();
      } catch {
        alert("Network error");
      }
    },
    [fetchAccounts]
  );

  const toggleActive = useCallback(
    async (acct: BankAccount) => {
      try {
        await fetch(`/api/bank-accounts/${acct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !acct.isActive }),
        });
        fetchAccounts();
      } catch {
        /* silent */
      }
    },
    [fetchAccounts]
  );

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">
              Finance
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-default">
              Banking
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {["accounts", "reconciliation"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  if (t === "reconciliation") {
                    window.location.href = "/banking/reconciliation";
                  } else {
                    setTab(t);
                  }
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
                  tab === t
                    ? "bg-cyan-500 text-slate-950"
                    : "border border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      {tab === "accounts" && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="kpi-card kpi-accent-cyan">
              <p className="text-muted text-xs">Total Accounts</p>
              <p className="text-default mt-1 text-2xl font-semibold">
                {accounts.length}
              </p>
            </div>
            <div className="kpi-card kpi-accent-green">
              <p className="text-muted text-xs">Active Accounts</p>
              <p className="text-success mt-1 text-2xl font-semibold">
                {activeCount}
              </p>
            </div>
            <div className="kpi-card kpi-accent-purple">
              <p className="text-muted text-xs">Total Balance</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-300">
                {formatAmount(totalBalance, currentOrgCurrency)}
              </p>
            </div>
            <div className="kpi-card kpi-accent-amber">
              <p className="text-muted text-xs">Transactions</p>
              <p className="text-warning mt-1 text-2xl font-semibold">
                {totalTransactions}
              </p>
            </div>
          </div>

          {/* Accounts Table */}
          <section className="section-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-default text-lg font-semibold">
                Bank Accounts
              </h2>
              <button onClick={openCreate} className="btn-primary">
                + Add Account
              </button>
            </div>

            {loading ? (
              <p className="text-muted py-8 text-center text-sm">Loading…</p>
            ) : accounts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted mb-2 text-lg">No bank accounts yet</p>
                <p className="text-muted mb-4 text-sm">
                  Add your first bank account to start tracking balances
                </p>
                <button onClick={openCreate} className="btn-primary">
                  + Add Bank Account
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-default text-muted">
                      <th className="p-3 font-medium">Account</th>
                      <th className="p-3 font-medium">Bank</th>
                      <th className="p-3 font-medium">Number</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium text-right">Balance</th>
                      <th className="p-3 font-medium text-center">Txns</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr
                        key={a.id}
                        className="border-t border-default hover:bg-card-hover"
                      >
                        <td className="p-3 text-default font-medium">
                          {a.name}
                        </td>
                        <td className="p-3 text-slate-300">
                          {a.bankName || "—"}
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-400">
                          {formatAcctNumber(a.accountNumber)}
                        </td>
                        <td className="p-3">
                          <span className="badge badge-pending capitalize">
                            {a.type.replace("_", " ")}
                          </span>
                        </td>
                        <td
                          className={`p-3 text-right font-semibold ${
                            a.currentBalance >= 0
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {formatAmount(a.currentBalance, currentOrgCurrency)}
                        </td>
                        <td className="p-3 text-center text-slate-400">
                          {a._count.transactions}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleActive(a)}
                            className={`badge cursor-pointer ${
                              a.isActive
                                ? "badge-completed"
                                : "badge-overdue"
                            }`}
                          >
                            {a.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(a)}
                              className="text-xs text-cyan-300 hover:text-cyan-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Reconciliation tab — redirect note */}
      {tab === "reconciliation" && (
        <section className="section-card py-12 text-center">
          <p className="text-muted mb-2 text-lg">
            Redirecting to Reconciliation…
          </p>
          <Link
            href="/banking/reconciliation"
            className="text-cyan-300 text-sm hover:underline"
          >
            Go to Reconciliation →
          </Link>
        </section>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="section-card mx-4 w-full max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-default text-lg font-semibold">
                {editingId ? "Edit Bank Account" : "Add Bank Account"}
              </h2>
              <button
                onClick={closeForm}
                className="text-muted text-xl hover:text-default"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-muted mb-1 block text-xs">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="input-field w-full"
                  placeholder="e.g. HDFC Business A/c"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bankName: e.target.value }))
                    }
                    className="input-field w-full"
                    placeholder="HDFC Bank"
                  />
                </div>
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    Account Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    className="input-field w-full"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accountNumber: e.target.value,
                      }))
                    }
                    className="input-field w-full"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={form.ifscCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ifscCode: e.target.value }))
                    }
                    className="input-field w-full"
                    placeholder="HDFC0001234"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted mb-1 block text-xs">
                  Branch
                </label>
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, branch: e.target.value }))
                  }
                  className="input-field w-full"
                  placeholder="Main Branch, Mumbai"
                />
              </div>

              <div>
                <label className="text-muted mb-1 block text-xs">
                  Opening Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      openingBalance: e.target.value,
                    }))
                  }
                  className="input-field w-full"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Update Account"
                      : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

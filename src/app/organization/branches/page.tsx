"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  isActive: boolean;
  createdAt: string;
  _count: { invoices: number };
};

type BranchForm = {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
};

const EMPTY_FORM: BranchForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstin: "",
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
  "Andaman & Nicobar", "Dadra & Nagar Haveli", "Lakshadweep",
];

export default function BranchesPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ORG_ADMIN";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/organization/branches");
      const data = await res.json();
      setBranches(data.branches ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const activeCount = branches.filter((b) => b.isActive).length;
  const totalInvoices = branches.reduce((s, b) => s + b._count.invoices, 0);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((branch: Branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      pincode: branch.pincode,
      gstin: branch.gstin,
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
        setError("Branch name is required");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const url = editingId
          ? `/api/organization/branches/${editingId}`
          : "/api/organization/branches";
        const method = editingId ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to save");
          return;
        }
        closeForm();
        fetchBranches();
      } catch {
        setError("Network error — try again");
      } finally {
        setSaving(false);
      }
    },
    [form, editingId, closeForm, fetchBranches]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this branch?")) return;
      try {
        const res = await fetch(`/api/organization/branches/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Cannot delete");
          return;
        }
        fetchBranches();
      } catch {
        alert("Network error");
      }
    },
    [fetchBranches]
  );

  const toggleActive = useCallback(
    async (branch: Branch) => {
      try {
        await fetch(`/api/organization/branches/${branch.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !branch.isActive }),
        });
        fetchBranches();
      } catch {
        /* silent */
      }
    },
    [fetchBranches]
  );

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">
              <Link href="/organization/settings" className="hover:text-cyan-300">
                Organization
              </Link>{" "}
              / Branches
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-default">
              Branch Management
            </h1>
            <p className="text-muted mt-1 text-sm">
              Manage branch locations for your organization
            </p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary">
              + Add Branch
            </button>
          )}
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="kpi-card kpi-accent-cyan">
          <p className="text-muted text-xs">Total Branches</p>
          <p className="text-default mt-1 text-2xl font-semibold">
            {branches.length}
          </p>
        </div>
        <div className="kpi-card kpi-accent-green">
          <p className="text-muted text-xs">Active Branches</p>
          <p className="text-success mt-1 text-2xl font-semibold">
            {activeCount}
          </p>
        </div>
        <div className="kpi-card kpi-accent-purple">
          <p className="text-muted text-xs">Total Invoices</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-300">
            {totalInvoices}
          </p>
        </div>
      </div>

      {/* Branches Table */}
      <section className="section-card">
        {loading ? (
          <p className="text-muted py-8 text-center text-sm">Loading…</p>
        ) : branches.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted mb-2 text-lg">No branches yet</p>
            <p className="text-muted mb-4 text-sm">
              Add branches to organize invoices by location
            </p>
            {isAdmin && (
              <button onClick={openCreate} className="btn-primary">
                + Add First Branch
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-default text-muted">
                  <th className="p-3 font-medium">Branch</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">GSTIN</th>
                  <th className="p-3 font-medium text-center">Invoices</th>
                  <th className="p-3 font-medium">Status</th>
                  {isAdmin && (
                    <th className="p-3 font-medium text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-default hover:bg-card-hover"
                  >
                    <td className="p-3">
                      <p className="text-default font-medium">{b.name}</p>
                      {b.address && (
                        <p className="text-muted text-xs">{b.address}</p>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">
                      {[b.city, b.state].filter(Boolean).join(", ") || "—"}
                      {b.pincode && (
                        <span className="ml-1 text-xs text-slate-500">
                          {b.pincode}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-400">
                      {b.gstin || "—"}
                    </td>
                    <td className="p-3 text-center text-slate-400">
                      {b._count.invoices}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(b)}
                        className={`badge cursor-pointer ${
                          b.isActive ? "badge-completed" : "badge-overdue"
                        }`}
                      >
                        {b.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(b)}
                            className="text-xs text-cyan-300 hover:text-cyan-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="section-card mx-4 w-full max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-default text-lg font-semibold">
                {editingId ? "Edit Branch" : "Add Branch"}
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
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="input-field w-full"
                  placeholder="e.g. Mumbai Branch"
                  required
                />
              </div>

              <div>
                <label className="text-muted mb-1 block text-xs">
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className="input-field w-full"
                  placeholder="123 Business Park, Andheri East"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted mb-1 block text-xs">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                    className="input-field w-full"
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    State
                  </label>
                  <select
                    value={form.state}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, state: e.target.value }))
                    }
                    className="input-field w-full"
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pincode: e.target.value }))
                    }
                    className="input-field w-full"
                    placeholder="400069"
                  />
                </div>
                <div>
                  <label className="text-muted mb-1 block text-xs">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={form.gstin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gstin: e.target.value }))
                    }
                    className="input-field w-full"
                    placeholder="27AABCU9603R1ZM"
                    maxLength={15}
                  />
                </div>
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
                      ? "Update Branch"
                      : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

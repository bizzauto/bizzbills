"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────
interface PermissionEntry {
  permission: string;
  allowed: boolean;
}

interface RolePermissions {
  role: string;
  permissions: PermissionEntry[];
}

interface PermissionModules {
  [module: string]: string[];
}

interface PermissionsResponse {
  modules: PermissionModules;
  roles: RolePermissions[];
  currentRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  VIEWER: "Viewer",
  ACCOUNTANT: "Accountant",
  SALES_MANAGER: "Sales Manager",
  ORG_ADMIN: "Org Admin",
};

const MODULE_LABELS: Record<string, string> = {
  invoices: "Invoices",
  payments: "Payments",
  parties: "Parties (Customers / Vendors)",
  products: "Products",
  orders: "Orders",
  reports: "Reports",
  settings: "Settings",
  users: "Users",
  accounting: "Accounting",
  inventory: "Inventory",
};

// ─── Page ──────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const [data, setData] = useState<PermissionsResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("VIEWER");
  const [localPerms, setLocalPerms] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/permissions");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load permissions");
      }
      const json: PermissionsResponse = await res.json();
      setData(json);
      if (json.roles.length > 0 && !json.roles.find((r) => r.role === selectedRole)) {
        setSelectedRole(json.roles[0].role);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Sync local toggles when role or data changes
  useEffect(() => {
    if (!data) return;
    const roleData = data.roles.find((r) => r.role === selectedRole);
    if (!roleData) {
      setLocalPerms(new Map());
      return;
    }
    const map = new Map<string, boolean>();
    for (const entry of roleData.permissions) {
      map.set(entry.permission, entry.allowed);
    }
    setLocalPerms(map);
  }, [data, selectedRole]);

  const isDirty = (() => {
    if (!data) return false;
    const roleData = data.roles.find((r) => r.role === selectedRole);
    if (!roleData) return false;
    for (const entry of roleData.permissions) {
      if (localPerms.get(entry.permission) !== entry.allowed) return true;
    }
    return false;
  })();

  function togglePermission(perm: string) {
    setLocalPerms((prev) => {
      const next = new Map(prev);
      next.set(perm, !(next.get(perm) ?? false));
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!data || !isDirty) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    const roleData = data.roles.find((r) => r.role === selectedRole);
    if (!roleData) {
      setSaving(false);
      return;
    }

    // Collect changed permissions
    const changes: Array<{ permission: string; allowed: boolean }> = [];
    for (const entry of roleData.permissions) {
      const current = localPerms.get(entry.permission) ?? false;
      if (current !== entry.allowed) {
        changes.push({ permission: entry.permission, allowed: current });
      }
    }

    let allOk = true;
    for (const change of changes) {
      try {
        const res = await fetch("/api/admin/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: selectedRole,
            permission: change.permission,
            allowed: change.allowed,
          }),
        });
        if (!res.ok) allOk = false;
      } catch {
        allOk = false;
      }
    }

    if (allOk) {
      setSaved(true);
      // Refresh from server to confirm
      await fetchPermissions();
    } else {
      setError("Some permissions could not be saved. Please try again.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-6 pb-10">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Role Permissions</h1>
        </section>
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-400">Loading permissions...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex flex-1 flex-col gap-6 pb-10">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Role Permissions</h1>
        </section>
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      </main>
    );
  }

  const roleData = data?.roles.find((r) => r.role === selectedRole);
  const modules = data?.modules ?? {};

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Role Permissions</h1>
            <p className="mt-2 text-sm text-slate-400">
              Fine-tune what each role can do within your organization.
            </p>
          </div>
          {data?.currentRole && (
            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2">
              <span className="text-xs text-slate-500">Your role</span>
              <p className="font-semibold text-cyan-300">
                {ROLE_LABELS[data.currentRole] ?? data.currentRole}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Role selector + Save */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {data?.roles.map((r) => (
            <button
              key={r.role}
              onClick={() => setSelectedRole(r.role)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedRole === r.role
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-white/10 bg-slate-900/70 text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              {ROLE_LABELS[r.role] ?? r.role}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-40"
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
        </button>
      </section>

      {/* Status messages */}
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Permissions saved successfully.
        </div>
      )}

      {/* Permission grid */}
      {roleData && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(modules).map(([module, actions]) => (
            <div
              key={module}
              className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur"
            >
              <h2 className="text-lg font-semibold text-white">
                {MODULE_LABELS[module] ?? module}
              </h2>
              <div className="mt-4 space-y-3">
                {actions.map((action) => {
                  const perm = `${module}.${action}`;
                  const checked = localPerms.get(perm) ?? false;
                  return (
                    <label
                      key={perm}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 transition hover:bg-slate-900/50"
                    >
                      <span className="text-sm font-medium text-slate-200 capitalize">
                        {action.replace(/-/g, " ")}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => togglePermission(perm)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                          checked ? "bg-cyan-500" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                            checked ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin note */}
      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
        <strong className="text-white">Note:</strong> Super Admin and Org Admin roles have all
        permissions by default and cannot be restricted. Permission overrides are stored per
        organization.
      </div>
    </main>
  );
}

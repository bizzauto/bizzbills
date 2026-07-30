"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

type UserRecord = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  orgId: string | null;
  org: { name: string } | null;
};

const ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "ACCOUNTANT", "SALES_MANAGER", "VIEWER"];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  ORG_ADMIN: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  ACCOUNTANT: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  SALES_MANAGER: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
  VIEWER: { bg: "rgba(99,102,241,0.15)", text: "#6366f1" },
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("VIEWER");
  const [addError, setAddError] = useState("");

  const fetchUsers = useCallback(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAddError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          password: addPassword,
          role: addRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to create user");
        return;
      }

      setShowAddModal(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddRole("VIEWER");
      fetchUsers();
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRole(userId: string, newRole: string) {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch {
      // ignore
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      fetchUsers();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            User Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {users.length} total users
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          + Add User
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search users by name, email, or role..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-cyan-500/40"
        style={{
          background: "var(--card)",
          borderColor: "var(--card-border)",
          color: "var(--foreground)",
        }}
      />

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        {loading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
            {search ? "No users match your search" : "No users found"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
                  <th className="px-6 py-3 font-medium" style={{ color: "var(--muted)" }}>User</th>
                  <th className="px-6 py-3 font-medium" style={{ color: "var(--muted)" }}>Role</th>
                  <th className="px-6 py-3 font-medium" style={{ color: "var(--muted)" }}>Organization</th>
                  <th className="px-6 py-3 font-medium" style={{ color: "var(--muted)" }}>Joined</th>
                  <th className="px-6 py-3 font-medium" style={{ color: "var(--muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {filteredUsers.map((user) => {
                  const isMe = session?.user?.id === user.id;
                  const colors = ROLE_COLORS[user.role] || ROLE_COLORS.VIEWER;
                  return (
                    <tr key={user.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                            style={{ background: "var(--badge-bg)", color: "var(--accent)" }}
                          >
                            {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: "var(--foreground)" }}>
                              {user.name || "Unnamed"}
                              {isMe && <span className="ml-1 text-xs opacity-50">(you)</span>}
                            </p>
                            <p className="text-xs" style={{ color: "var(--muted)" }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          disabled={isMe}
                          className="rounded-lg border px-2 py-1 text-xs font-medium outline-none disabled:opacity-50"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            borderColor: "transparent",
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.replace("_", " ")}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3" style={{ color: "var(--muted)" }}>
                        {user.org?.name || "—"}
                      </td>
                      <td className="px-6 py-3 text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-3">
                        {!isMe && (
                          <button
                            onClick={() => setEditingUser(user)}
                            className="mr-2 text-xs font-medium text-cyan-400 hover:text-cyan-300"
                          >
                            Edit
                          </button>
                        )}
                        {!isMe && user.role !== "SUPER_ADMIN" && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-xs font-medium text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
          >
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Add New User
            </h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>Email *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>Password *</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              {addError && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                  {addError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(""); }}
                  className="flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition"
                  style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update");
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          Edit User
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition"
              style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type TenantUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  joinedAt: string;
};

export default function OrganizationUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    fetchUsers();
  }, [status, router]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/organization/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setInviting(true);
    setMessage("");

    try {
      const res = await fetch("/api/organization/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");

      setMessage(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteEmail("");
      fetchUsers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this user from the organization?")) return;

    try {
      const res = await fetch(`/api/organization/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      fetchUsers();
    } catch {
      setMessage("Failed to remove user");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section>
        <h1 className="text-2xl font-semibold text-white">Team Members</h1>
        <p className="mt-1 text-sm text-slate-400">Invite and manage users for your organization.</p>
      </section>

      {message && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          {message}
        </div>
      )}

      <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="user@company.com"
          required
          className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-0 focus:border-cyan-500/50"
        >
          <option value="VIEWER">Viewer</option>
          <option value="ACCOUNTANT">Accountant</option>
          <option value="SALES_MANAGER">Sales Manager</option>
          <option value="ORG_ADMIN">Admin</option>
        </select>
        <button
          type="submit"
          disabled={inviting}
          className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {inviting ? "Inviting…" : "Invite"}
        </button>
      </form>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No team members yet. Invite your first member above.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-white">{user.name ?? user.email}</p>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-300">
                    {user.role}
                  </span>
                  {user.role !== "ORG_ADMIN" && (
                    <button
                      onClick={() => handleRemove(user.id)}
                      className="text-sm text-red-400 transition hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/organization/settings" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to Organization Settings
      </Link>
    </main>
  );
}
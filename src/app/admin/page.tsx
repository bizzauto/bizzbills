"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type UserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  org: { name: string } | null;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const stats = [
    { label: "Total Users", value: users.length, color: "#22d3ee" },
    { label: "Super Admins", value: roleCounts["SUPER_ADMIN"] || 0, color: "#f59e0b" },
    { label: "Org Admins", value: roleCounts["ORG_ADMIN"] || 0, color: "#10b981" },
    { label: "Viewers", value: roleCounts["VIEWER"] || 0, color: "#6366f1" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Admin Panel
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Welcome back, {session?.user?.name || session?.user?.email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: stat.color }}>
              {loading ? "—" : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/users"
          className="group flex items-center gap-4 rounded-2xl p-6 transition-all hover:scale-[1.01]"
          style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-2xl">
            👥
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
              User Management
            </h3>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Add, edit, or remove users
            </p>
          </div>
        </Link>

        <div
          className="flex items-center gap-4 rounded-2xl p-6 opacity-50"
          style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-2xl">
            🏢
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
              Organizations
            </h3>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Coming soon
            </p>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--card-border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--foreground)" }}>
            Recent Users
          </h2>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
          {loading ? (
            <div className="px-6 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
              Loading...
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
              No users found
            </div>
          ) : (
            users.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ background: "var(--badge-bg)", color: "var(--accent)" }}
                  >
                    {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {user.name || "Unnamed"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    background:
                      user.role === "SUPER_ADMIN"
                        ? "rgba(245,158,11,0.15)"
                        : user.role === "ORG_ADMIN"
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(99,102,241,0.15)",
                    color:
                      user.role === "SUPER_ADMIN"
                        ? "#f59e0b"
                        : user.role === "ORG_ADMIN"
                        ? "#10b981"
                        : "#6366f1",
                  }}
                >
                  {user.role.replace("_", " ")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

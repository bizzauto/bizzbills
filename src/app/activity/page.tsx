"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<{ id: string; action: string; entity: string; details: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity").then((r) => r.json()).then((d) => { setLogs(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Log</h1>
            <p className="text-sm text-slate-400">Audit trail of all system changes</p>
          </div>
          <Link href="/dashboard" className="text-xs text-cyan-400 hover:underline">&larr; Dashboard</Link>
        </div>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-slate-500">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg bg-slate-800/50 p-3 text-sm">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                  log.action === "create" ? "bg-emerald-500/20 text-emerald-300"
                  : log.action === "update" ? "bg-amber-500/20 text-amber-300"
                  : log.action === "delete" ? "bg-red-500/20 text-red-300"
                  : "bg-blue-500/20 text-blue-300"
                }`}>{log.action}</span>
                <span className="font-medium text-slate-200">{log.entity}</span>
                <span className="text-slate-500">{log.details}</span>
                    <span className="ml-auto text-xs text-slate-500">{fmtDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

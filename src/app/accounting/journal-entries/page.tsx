"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type JournalEntry = {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference: string | null;
  isPosted: boolean;
  lines: { id: string; accountId: string; debit: number; credit: number; description: string; account: { name: string; code: string } }[];
};

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function fetchEntries() {
    try {
      const res = await fetch("/api/accounting/journal-entries");
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntries();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this journal entry?")) return;

    try {
      const res = await fetch(`/api/accounting/journal-entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMessage("Entry deleted");
      fetchEntries();
    } catch {
      setMessage("Failed to delete entry");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Journal Entries</h1>
          <p className="mt-1 text-sm text-slate-400">View and manage double-entry journal transactions.</p>
        </div>
        <Link href="/accounting/journal-entries/new" className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
          + New Entry
        </Link>
      </section>

      {message && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          {message}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No journal entries yet. Create your first entry.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Entry #</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Lines</th>
                  <th className="px-4 py-3 font-medium">Posted</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-slate-300">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-white">{entry.entryNumber}</td>
                    <td className="px-4 py-3 text-slate-300">{entry.description}</td>
                    <td className="px-4 py-3 text-slate-400">{entry.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{entry.lines.length}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.isPosted ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                        {entry.isPosted ? "Posted" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(entry.id)} className="text-sm text-red-400 transition hover:text-red-300">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import type { DiffChange } from "@/lib/diff";

const typeStyles: Record<string, string> = {
  added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  removed: "border-red-500/30 bg-red-500/10 text-red-200",
  changed: "border-amber-500/30 bg-amber-500/10 text-amber-200",
};

const typeIcon: Record<string, string> = {
  added: "+",
  removed: "−",
  changed: "↗",
};

function formatValue(value: unknown): string {
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

export function DiffViewer({ changes }: { changes: DiffChange[] }) {
  if (changes.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        No changes in this version.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((change) => (
        <div
          key={change.path}
          className={`rounded-xl border p-3 text-sm ${typeStyles[change.type] || "border-white/10 bg-slate-950/70 text-slate-300"}`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 font-mono text-xs font-bold">
              {typeIcon[change.type] || "•"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{change.label}</p>
              {change.type === "changed" && (
                <div className="mt-1 space-y-0.5 font-mono text-xs">
                  <p className="text-red-400 line-through">
                    {change.from !== undefined ? formatValue(change.from) : ""}
                  </p>
                  <p className="text-emerald-400">
                    {change.to !== undefined ? formatValue(change.to) : ""}
                  </p>
                </div>
              )}
              {change.type === "added" && change.to !== undefined && (
                <p className="mt-1 font-mono text-xs text-emerald-300">
                  {formatValue(change.to)}
                </p>
              )}
              {change.type === "removed" && change.from !== undefined && (
                <p className="mt-1 font-mono text-xs text-red-300">
                  {formatValue(change.from)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

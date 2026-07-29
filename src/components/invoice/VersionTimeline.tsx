"use client";

type VersionEntry = {
  id: string;
  version: number;
  changeComment: string;
  createdAt: string;
};

export function VersionTimeline({
  versions,
  currentVersion,
  onSelectVersion,
}: {
  versions: VersionEntry[];
  currentVersion: number;
  onSelectVersion?: (versionId: string) => void;
}) {
if (versions.length === 0) {
      return (
        <div className="section-card text-sm text-muted">
          No version history yet.
        </div>
      );
    }

  return (
    <div className="space-y-0">
      {versions.map((v, i) => {
        const isCurrent = v.version === currentVersion;
        const isLast = i === versions.length - 1;

        return (
          <div key={v.id} className="relative flex gap-4 pb-6">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[7px] top-4 h-full w-px bg-slate-700" />
            )}

            {/* Dot */}
            <div
              className={`relative z-10 mt-1.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 ${
                isCurrent
                  ? "border-cyan-400 bg-cyan-500/30"
                  : "border-slate-600 bg-slate-800"
              }`}
            />

            {/* Content */}
            <div className="min-w-0 flex-1">
               <button
                 type="button"
                 onClick={() => onSelectVersion?.(v.id)}
                 className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                   isCurrent
                     ? "border-cyan-500/30 bg-cyan-500/10"
                     : "border-default bg-surface-darker hover-brighten"
                 }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    v{v.version}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-300">
                      current
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {v.changeComment}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {new Date(v.createdAt).toLocaleString()}
                </p>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

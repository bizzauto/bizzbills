"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

/* ── Shortcut definitions ── */
const SHORTCUT_DESCRIPTIONS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Open global search" },
  { keys: ["Ctrl", "N"], label: "New invoice" },
  { keys: ["Ctrl", "/"], label: "Show keyboard shortcuts" },
  { keys: ["Escape"], label: "Close modal / dismiss" },
  { keys: ["↑", "↓"], label: "Navigate search results" },
  { keys: ["Enter"], label: "Open selected result" },
];

type KeyboardShortcutsProps = {
  onSearchOpen: () => void;
};

export function KeyboardShortcuts({ onSearchOpen }: KeyboardShortcutsProps) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const openNewInvoice = useCallback(() => {
    router.push("/billing");
  }, [router]);

  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  /* ── Register global keyboard shortcuts ── */
  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      navigator.platform?.toUpperCase().includes("MAC");

    function handleKeyDown(e: KeyboardEvent) {
      const mod = isMac ? e.metaKey : e.ctrlKey;

      /* Ctrl+K / Cmd+K: Open global search */
      if (mod && e.key === "k") {
        e.preventDefault();
        onSearchOpen();
        return;
      }

      /* Ctrl+N / Cmd+N: New invoice */
      if (mod && e.key === "n") {
        e.preventDefault();
        openNewInvoice();
        return;
      }

      /* Ctrl+/ : Show shortcuts help */
      if (mod && e.key === "/") {
        e.preventDefault();
        toggleHelp();
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSearchOpen, openNewInvoice, toggleHelp]);

  /* ── Help modal ── */
  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center"
      onClick={() => setShowHelp(false)}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--card)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5"
                style={{ color: "var(--accent)" }}
              >
                <rect x={2} y={4} width={16} height={12} rx={2} stroke="currentColor" strokeWidth={1.5} />
                <path d="M6 8h1.5M9 8h1.5M12.5 8h1.5M6 11h2M10 11h4" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
              </svg>
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/5"
              style={{ color: "var(--muted)" }}
              aria-label="Close shortcuts"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          {/* Shortcut list */}
          <div className="px-5 py-3">
            {SHORTCUT_DESCRIPTIONS.map((shortcut) => (
              <div
                key={shortcut.label}
                className="flex items-center justify-between border-b py-2.5 last:border-b-0"
                style={{ borderColor: "var(--card-border)" }}
              >
                <span
                  className="text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {shortcut.label}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="rounded border px-2 py-1 text-[11px] font-mono font-medium"
                      style={{
                        borderColor: "var(--card-border)",
                        background: "var(--badge-bg)",
                        color: "var(--muted)",
                      }}
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="border-t px-5 py-3 text-center"
            style={{ borderColor: "var(--card-border)" }}
          >
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
              Press{" "}
              <kbd
                className="mx-0.5 rounded border px-1 py-0.5 text-[10px]"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--badge-bg)",
                }}
              >
                Ctrl
              </kbd>
              +
              <kbd
                className="mx-0.5 rounded border px-1 py-0.5 text-[10px]"
                style={{
                  borderColor: "var(--card-border)",
                  background: "var(--badge-bg)",
                }}
              >
                /
              </kbd>{" "}
              to toggle this panel
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

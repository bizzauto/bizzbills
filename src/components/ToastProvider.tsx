"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

const ToastContext = createContext<{
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
}>({ toasts: [], addToast: () => {}, removeToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons: Record<ToastType, string> = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

const styles: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#34d399" },
  error: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", text: "#f87171" },
  info: { bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)", text: "#22d3ee" },
  warning: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#fbbf24" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const s = styles[toast.type];
  return (
    <div
      className="pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl min-w-[320px] max-w-md animate-slide-up"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <span className="mt-0.5 text-lg">{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: s.text }}>{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{toast.message}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 text-sm transition" style={{ color: "var(--muted)" }}>
        ✕
      </button>
    </div>
  );
}
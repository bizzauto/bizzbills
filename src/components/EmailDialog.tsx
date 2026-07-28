"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

type EmailDialogProps = {
  open: boolean;
  onClose: () => void;
  documentType: string;
  documentNumber: string;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
};

export function EmailDialog({ open, onClose, documentType, documentNumber, defaultTo, defaultSubject, defaultBody }: EmailDialogProps) {
  const { addToast } = useToast();
  const [to, setTo] = useState(defaultTo || "");
  const [subject, setSubject] = useState(defaultSubject || `${documentType} #${documentNumber}`);
  const [body, setBody] = useState(defaultBody || `Please find attached ${documentType} #${documentNumber}.`);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!to.trim()) { addToast("error", "Recipient email is required"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, documentType, documentNumber }),
      });
      if (res.ok) {
        addToast("success", "Email sent successfully", `Sent to ${to}`);
        onClose();
      } else {
        const data = await res.json();
        addToast("error", "Failed to send email", data.error);
      }
    } catch {
      addToast("error", "Failed to send email");
    } finally { setSending(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ borderColor: "var(--card-border)", background: "var(--card)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>Send {documentType}</h2>

        <div className="space-y-4">
          <label className="text-xs" style={{ color: "var(--muted)" }}>
            To (Recipient email) *
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} required placeholder="recipient@example.com"
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50" style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--foreground)" }} />
          </label>
          <label className="text-xs" style={{ color: "var(--muted)" }}>
            Subject
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50" style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--foreground)" }} />
          </label>
          <label className="text-xs" style={{ color: "var(--muted)" }}>
            Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50" style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--foreground)" }} />
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleSend} disabled={sending} className="rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
            {sending ? "Sending…" : "Send Email"}
          </button>
          <button onClick={onClose} className="rounded-full border px-6 py-2.5 text-sm transition" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
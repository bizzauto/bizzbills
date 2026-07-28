"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchResult = {
  label: string;
  href: string;
  subtitle: string;
  icon: string;
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const timer = setTimeout(async () => {
      const res: SearchResult[] = [];
      try {
        // Search invoices
        const invRes = await fetch("/api/invoices");
        const invs = await invRes.json();
        if (Array.isArray(invs)) {
          invs.filter((i: any) => i.customerName?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q))
            .slice(0, 4).forEach((i: any) => res.push({ label: `#${i.invoiceNumber}`, href: `/invoices/${i.id}`, subtitle: i.customerName, icon: "📄" }));
        }
        // Search orders
        for (const type of ["sales_order", "purchase_order", "quotation", "delivery_challan"]) {
          const oRes = await fetch(`/api/orders?type=${type}`);
          const ords = await oRes.json();
          if (Array.isArray(ords)) {
            ords.filter((o: any) => o.partyName?.toLowerCase().includes(q) || o.orderNumber?.toLowerCase().includes(q))
              .slice(0, 2).forEach((o: any) => res.push({ label: `#${o.orderNumber}`, href: `/orders/${o.id}`, subtitle: o.partyName, icon: "📋" }));
          }
        }
        // Search parties
        const pRes = await fetch("/api/parties");
        const parties = await pRes.json();
        if (Array.isArray(parties)) {
          parties.filter((p: any) => p.name?.toLowerCase().includes(q)).slice(0, 4)
            .forEach((p: any) => res.push({ label: p.name, href: `/parties/${p.id}`, subtitle: p.type, icon: "👤" }));
        }
      } catch {}
      setResults(res.slice(0, 8));
      setSelectedIdx(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) { router.push(results[selectedIdx].href); onClose(); }
    if (e.key === "Escape") { onClose(); }
  }, [results, selectedIdx, router, onClose]);

  return open ? (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
          {/* Input */}
          <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--card-border)" }}>
            <span className="text-lg">🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search invoices, orders, parties…"
              className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--foreground)" }}
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>ESC</kbd>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto p-2">
              {results.map((r, i) => (
                <Link key={r.href} href={r.href} onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${i === selectedIdx ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300" : ""}`}
                  style={i === selectedIdx ? {} : { color: "var(--foreground)" }}>
                  <span>{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{r.label}</span>
                    <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>{r.subtitle}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>↵</span>
                </Link>
              ))}
            </div>
          )}
          {query && results.length === 0 && (
            <div className="p-6 text-center text-sm" style={{ color: "var(--muted)" }}>No results found</div>
          )}
          <div className="border-t px-4 py-2 text-[10px]" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
            Navigate with ↑↓ • Open with ↵ • Dismiss with ESC
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
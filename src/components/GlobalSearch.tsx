"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ── Types ── */
type SearchCategory = "invoices" | "parties" | "products" | "orders" | "payments";

type SearchResult = {
  label: string;
  href: string;
  subtitle: string;
  icon: string;
  category: SearchCategory;
};

type GroupedResults = {
  category: SearchCategory;
  label: string;
  icon: string;
  items: SearchResult[];
};

/* ── Category metadata ── */
const CATEGORIES: Record<SearchCategory, { label: string; icon: string }> = {
  invoices: { label: "Invoices", icon: "📄" },
  parties: { label: "Parties", icon: "👤" },
  products: { label: "Products", icon: "📦" },
  orders: { label: "Orders", icon: "📋" },
  payments: { label: "Payments", icon: "💳" },
};

const CATEGORY_ORDER: SearchCategory[] = [
  "invoices",
  "orders",
  "parties",
  "products",
  "payments",
];

/* ── Recent searches (localStorage) ── */
const RECENT_SEARCHES_KEY = "bizzbills:recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return;
  try {
    const recent = getRecentSearches().filter((r) => r !== query);
    recent.unshift(query);
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT)),
    );
  } catch {
    /* ignore quota errors */
  }
}

/* ── Component ── */
export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [groupedResults, setGroupedResults] = useState<GroupedResults[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  /* ── Flatten results for keyboard navigation ── */
  const flatResults: SearchResult[] = groupedResults.flatMap((g) => g.items);

  /* ── Focus on open ── */
  useEffect(() => {
    if (open) {
      setQuery("");
      setGroupedResults([]);
      setSelectedIdx(0);
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* ── Search with debounce ── */
  useEffect(() => {
    if (!query.trim()) {
      setGroupedResults([]);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    const timer = setTimeout(async () => {
      const q = query.toLowerCase();
      const grouped: Record<SearchCategory, SearchResult[]> = {
        invoices: [],
        parties: [],
        products: [],
        orders: [],
        payments: [],
      };

      try {
        const [invRes, partyRes, productRes, orderRes, paymentRes] =
          await Promise.all([
            fetch("/api/invoices").catch(() => null),
            fetch("/api/parties").catch(() => null),
            fetch("/api/products").catch(() => null),
            fetch("/api/orders?type=sales_order").catch(() => null),
            fetch("/api/payments").catch(() => null),
          ]);

        if (cancelled) return;

        /* Invoices */
        if (invRes?.ok) {
          const invs = await invRes.json();
          if (Array.isArray(invs)) {
            invs
              .filter(
                (i: Record<string, unknown>) =>
                  (i.customerName as string)?.toLowerCase().includes(q) ||
                  (i.invoiceNumber as string)?.toLowerCase().includes(q),
              )
              .slice(0, 4)
              .forEach((i: Record<string, unknown>) =>
                grouped.invoices.push({
                  label: `#${i.invoiceNumber}`,
                  href: `/invoices/${i.id}`,
                  subtitle: i.customerName as string,
                  icon: "📄",
                  category: "invoices",
                }),
              );
          }
        }

        /* Parties */
        if (partyRes?.ok) {
          const parties = await partyRes.json();
          if (Array.isArray(parties)) {
            parties
              .filter((p: Record<string, unknown>) =>
                (p.name as string)?.toLowerCase().includes(q),
              )
              .slice(0, 3)
              .forEach((p: Record<string, unknown>) =>
                grouped.parties.push({
                  label: p.name as string,
                  href: `/parties/${p.id}`,
                  subtitle: p.type as string,
                  icon: "👤",
                  category: "parties",
                }),
              );
          }
        }

        /* Products */
        if (productRes?.ok) {
          const products = await productRes.json();
          if (Array.isArray(products)) {
            products
              .filter((p: Record<string, unknown>) =>
                (p.name as string)?.toLowerCase().includes(q),
              )
              .slice(0, 3)
              .forEach((p: Record<string, unknown>) =>
                grouped.products.push({
                  label: p.name as string,
                  href: `/inventory/${p.id}`,
                  subtitle: `Rs. ${p.price ?? 0}`,
                  icon: "📦",
                  category: "products",
                }),
              );
          }
        }

        /* Orders */
        if (orderRes?.ok) {
          const orders = await orderRes.json();
          if (Array.isArray(orders)) {
            orders
              .filter(
                (o: Record<string, unknown>) =>
                  (o.partyName as string)?.toLowerCase().includes(q) ||
                  (o.orderNumber as string)?.toLowerCase().includes(q),
              )
              .slice(0, 3)
              .forEach((o: Record<string, unknown>) =>
                grouped.orders.push({
                  label: `#${o.orderNumber}`,
                  href: `/orders/${o.id}`,
                  subtitle: o.partyName as string,
                  icon: "📋",
                  category: "orders",
                }),
              );
          }
        }

        /* Payments */
        if (paymentRes?.ok) {
          const payments = await paymentRes.json();
          if (Array.isArray(payments)) {
            payments
              .filter(
                (p: Record<string, unknown>) =>
                  (p.reference as string)?.toLowerCase().includes(q) ||
                  (p.amount as number)?.toString().includes(q),
              )
              .slice(0, 3)
              .forEach((p: Record<string, unknown>) =>
                grouped.payments.push({
                  label: `Payment ${p.reference ?? ""}`,
                  href: `/payments/${p.id}`,
                  subtitle: `Rs. ${p.amount ?? 0}`,
                  icon: "💳",
                  category: "payments",
                }),
              );
          }
        }
      } catch {
        /* network error — show empty results */
      }

      if (cancelled) return;

      const resultGroups: GroupedResults[] = CATEGORY_ORDER
        .map((cat) => ({
          category: cat,
          label: CATEGORIES[cat].label,
          icon: CATEGORIES[cat].icon,
          items: grouped[cat],
        }))
        .filter((g) => g.items.length > 0);

      setGroupedResults(resultGroups);
      setSelectedIdx(0);
      setIsLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  /* ── Keyboard navigation ── */
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, flatResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && flatResults[selectedIdx]) {
        addRecentSearch(query);
        router.push(flatResults[selectedIdx].href);
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    },
    [flatResults, selectedIdx, query, router, onClose],
  );

  /* ── Handle recent search click ── */
  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
  }, []);

  /* ── Compute highlight index offset for grouped rendering ── */
  let flatIdx = -1;

  return open ? (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--card)",
          }}
        >
          {/* ── Search input ── */}
          <div
            className="flex items-center gap-3 border-b px-4 py-3"
            style={{ borderColor: "var(--card-border)" }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5 shrink-0"
              style={{ color: "var(--muted)" }}
            >
              <circle cx={9} cy={9} r={6} stroke="currentColor" strokeWidth={1.5} />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search invoices, parties, products..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--foreground)" }}
            />
            <kbd
              className="rounded border px-1.5 py-0.5 text-[10px]"
              style={{
                borderColor: "var(--card-border)",
                color: "var(--muted)",
              }}
            >
              ESC
            </kbd>
          </div>

          {/* ── Results area ── */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* Loading indicator */}
            {isLoading && query.trim() && (
              <div className="flex items-center justify-center gap-2 px-4 py-3">
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2"
                  style={{
                    borderColor: "var(--card-border)",
                    borderTopColor: "var(--accent)",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  Searching...
                </span>
              </div>
            )}

            {/* Grouped results */}
            {!isLoading &&
              groupedResults.map((group) => (
                <div key={group.category} className="px-2 pt-2">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    <span className="text-xs">{group.icon}</span>
                    <span
                      className="text-[11px] font-semibold uppercase"
                      style={{ letterSpacing: "0.08em" }}
                    >
                      {group.label}
                    </span>
                  </div>
                  {group.items.map((item) => {
                    flatIdx++;
                    const isSelected = flatIdx === selectedIdx;
                    return (
                      <Link
                        key={item.href + flatIdx}
                        href={item.href}
                        onClick={() => {
                          addRecentSearch(query);
                          onClose();
                        }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                          isSelected
                            ? "bg-cyan-500/10"
                            : ""
                        }`}
                        style={
                          isSelected
                            ? {}
                            : { color: "var(--foreground)" }
                        }
                      >
                        <span className="text-base">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span
                            className="font-medium"
                            style={
                              isSelected
                                ? { color: "var(--accent)" }
                                : { color: "var(--foreground)" }
                            }
                          >
                            {item.label}
                          </span>
                          {item.subtitle && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: "var(--muted)" }}
                            >
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--accent)" }}
                          >
                            ↵
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}

            {/* No results */}
            {query && !isLoading && groupedResults.length === 0 && (
              <div
                className="p-6 text-center text-sm"
                style={{ color: "var(--muted)" }}
              >
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Recent searches (shown when empty query) */}
            {!query && recentSearches.length > 0 && (
              <div className="px-2 pt-2">
                <div
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  <span className="text-xs">🕐</span>
                  <span
                    className="text-[11px] font-semibold uppercase"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    Recent
                  </span>
                </div>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleRecentClick(term)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all hover:bg-cyan-500/10"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      🕐
                    </span>
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer hints ── */}
          <div
            className="flex items-center justify-between border-t px-4 py-2"
            style={{
              borderColor: "var(--card-border)",
              color: "var(--muted)",
            }}
          >
            <span className="text-[10px]">
              Navigate with ↑↓ &middot; Open with ↵ &middot; Dismiss with ESC
            </span>
            <div className="flex gap-1.5">
              <kbd
                className="rounded border px-1 py-0.5 text-[9px]"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--muted)",
                }}
              >
                ⌘K
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useOrg } from "@/components/OrgProvider";
import { useState, useCallback } from "react";

/* ── Icons (lucide-style, inline) ── */
const Icons = {
  logo: () => (
    <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7">
      <rect x={2} y={2} width={24} height={24} rx={6} className="fill-cyan-500" />
      <path d="M9 10h10M9 14h7M9 18h4" stroke="#020617" strokeWidth={2} strokeLinecap="round" />
    </svg>
  ),
  collapseLeft: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 5L7 10l5 5" />
    </svg>
  ),
  collapseRight: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M8 5l5 5-5 5" />
    </svg>
  ),
  dashboard: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2.5} y={2.5} width={6} height={6} rx={1} />
      <rect x={11.5} y={2.5} width={6} height={6} rx={1} />
      <rect x={2.5} y={11.5} width={6} height={6} rx={1} />
      <rect x={11.5} y={11.5} width={6} height={6} rx={1} />
    </svg>
  ),
  billing: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h12v12H4z" />
      <path d="M7 7h6M7 10h6M7 13h4" />
    </svg>
  ),
  gst: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l7-4 7 4v6l-7 4-7-4V7z" />
      <path d="M10 10l-3-1.5M10 10v4M10 10l3-1.5" />
    </svg>
  ),
  accounting: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h14v14H3z" />
      <path d="M3 7h14" />
      <path d="M7 3v14" />
      <circle cx={10} cy={11} r={1.5} />
    </svg>
  ),
  payments: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x={1} y={4} width={18} height={12} rx={2} />
      <circle cx={10} cy={10} r={2} />
      <path d="M14 10h4M2 10h3" />
    </svg>
  ),
  banking: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l8-4 8 4" />
      <rect x={2} y={10} width={16} height={7} rx={1} />
      <path d="M5 14h3M12 14h3" />
    </svg>
  ),
  creditNote: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h10v14H5z" />
      <path d="M9 7l2 2-2 2" />
    </svg>
  ),
  debitNote: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h10v14H5z" />
      <path d="M9 9l2-2" />
      <path d="M9 9l2 2" />
    </svg>
  ),
  orders: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l7-3 7 3v8l-7 3-7-3V6z" />
      <path d="M3 6l7 3 7-3" />
      <path d="M10 9v8" />
    </svg>
  ),
  parties: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={10} cy={7} r={2.5} />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  ),
  payroll: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={3} width={14} height={14} rx={2} />
      <path d="M7 7h6M7 10h6M7 13h4" />
      <circle cx={14} cy={14} r={1} fill="currentColor" />
    </svg>
  ),
  inventory: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2} y={2} width={7} height={7} rx={1} />
      <rect x={11} y={2} width={7} height={7} rx={1} />
      <rect x={2} y={11} width={7} height={7} rx={1} />
      <rect x={11} y={11} width={7} height={7} rx={1} />
      <path d="M15 14v2M14 15h2" />
    </svg>
  ),
  recurring: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={10} cy={10} r={7} />
      <path d="M10 6v4l3 2" />
    </svg>
  ),
  currency: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={10} cy={10} r={7} />
      <path d="M7 8.5C7 7.7 7.7 7 8.5 7h3c.8 0 1.5.7 1.5 1.5 0 .8-.7 1.5-1.5 1.5h-3c-.8 0-1.5.7-1.5 1.5S7.7 13 8.5 13h3c.8 0 1.5-.7 1.5-1.5" />
      <path d="M10 6v8" />
    </svg>
  ),
  activity: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10h3l2-4 2 8 2-6 2 4 2-2h3" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={10} cy={10} r={2.5} />
      <path d="M10 1.5V4M10 16v2.5M18.5 10H16M4 10H1.5M16.5 3.5L14.5 5.5M5.5 14.5L3.5 16.5M16.5 16.5L14.5 14.5M5.5 5.5L3.5 3.5" />
    </svg>
  ),
  activityLog: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M3 10h3l2-4 2 8 2-6 2 4 1-2h2" />
    </svg>
  ),
  finance: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h14v14H3z" />
      <path d="M6 8h3v6H6z" />
      <path d="M11 6h3v8h-3z" />
    </svg>
  ),
  ai: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={10} cy={10} r={7} />
      <path d="M10 7v6M7 10h6" />
    </svg>
  ),
  reports: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16V4h4v12H4z" />
      <path d="M8 8h4v8H8z" />
      <path d="M12 6h4v10h-4z" />
    </svg>
  ),
  menu: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  ),
  chevronDown: () => (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  ),
};

/* ── Menu configuration ── */
type MenuItem = { label: string; href: string; icon: keyof typeof Icons; exact?: boolean };
type MenuGroup = { title: string; items: MenuItem[] };

const MENU_GROUPS: MenuGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { label: "Activity", href: "/activity", icon: "activityLog" },
    ],
  },
  {
    title: "Billing & Invoicing",
    items: [
      { label: "Billing", href: "/billing", icon: "billing" },
      { label: "Recurring", href: "/recurring-invoices", icon: "recurring" },
      { label: "Proforma Invoices", href: "/proforma-invoices", icon: "billing" },
      { label: "Credit Notes", href: "/credit-notes", icon: "creditNote" },
      { label: "Debit Notes", href: "/debit-notes", icon: "debitNote" },
    ],
  },
  {
    title: "Trade Documents",
    items: [
      { label: "Quotations", href: "/quotations", icon: "billing" },
      { label: "Delivery Challans", href: "/delivery-challan", icon: "billing" },
      { label: "Orders", href: "/orders", icon: "billing" },
    ],
  },
  {
    title: "GST & Compliance",
    items: [
      { label: "GST Dashboard", href: "/gst", icon: "gst" },
      { label: "HSN Codes", href: "/gst/hsn", icon: "gst" },
      { label: "E-Way Bills", href: "/gst/eway-bills", icon: "gst" },
      { label: "GSTR-1", href: "/gst/gstr-1", icon: "gst" },
      { label: "GSTR-3B", href: "/gst/gstr-3b", icon: "gst" },
      { label: "ITC", href: "/gst/itc", icon: "gst" },
      { label: "GST Settings", href: "/gst/settings", icon: "gst" },
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: "accounting" },
      { label: "Journal Entries", href: "/accounting/journal-entries", icon: "accounting" },
      { label: "Ledger", href: "/accounting/ledger", icon: "accounting" },
      { label: "Financial Reports", href: "/accounting/reports", icon: "finance" },
    ],
  },
  {
    title: "Payments & Banking",
    items: [
      { label: "Payments", href: "/payments", icon: "payments" },
      { label: "Banking", href: "/banking", icon: "banking" },
    ],
  },
  {
    title: "Trade",
    items: [
      { label: "Parties", href: "/parties", icon: "parties" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Products", href: "/inventory", icon: "inventory" },
      { label: "Warehouses", href: "/inventory/warehouses", icon: "inventory" },
    ],
  },
  {
    title: "HR & Payroll",
    items: [
      { label: "Payroll", href: "/payroll", icon: "payroll" },
    ],
  },
  {
    title: "AI Tools",
    items: [
      { label: "AI Assistant", href: "/ai", icon: "ai" },
      { label: "AI Draft", href: "/ai/draft", icon: "ai" },
      { label: "AI OCR", href: "/ai/ocr", icon: "ai" },
      { label: "AI Analyze", href: "/ai/analyze", icon: "ai" },
      { label: "AI Suggestions", href: "/ai/suggestions", icon: "ai" },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Reports", href: "/reports", icon: "reports" },
      { label: "Currency", href: "/currency", icon: "currency" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Profile", href: "/settings/profile", icon: "settings" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

/* ── Sidebar component ── */
export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { currentOrgName } = useOrg();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Auto-expand the group containing current route
    const initial: Record<string, boolean> = {};
    for (const group of MENU_GROUPS) {
      for (const item of group.items) {
        if (isActive(pathname, item.href, item.exact)) {
          initial[group.title] = true;
          break;
        }
      }
    }
    return initial;
  });

  const toggleGroup = useCallback((title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  // Close mobile drawer on route change
  const handleNav = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-300 backdrop-blur md:hidden"
        aria-label="Open sidebar"
      >
        <Icons.menu />
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Off-canvas drawer (mobile) + fixed sidebar (desktop) ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-white/[0.06] bg-slate-950/90 backdrop-blur-xl
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static
          ${collapsed ? "md:w-[68px]" : "md:w-[240px]"}
        `}
      >
        {/* ── Logo area ── */}
        <div className="flex h-14 shrink-0 items-center border-b border-white/[0.06] px-3">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden" onClick={handleNav}>
            <span className="shrink-0"><Icons.logo /></span>
            <span
              className={`
                whitespace-nowrap text-sm font-semibold tracking-tight text-white
                transition-opacity duration-200
                ${collapsed ? "md:opacity-0 md:w-0" : "opacity-100"}
              `}
            >
              BizzBills
            </span>
          </Link>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Icons.collapseRight /> : <Icons.collapseLeft />}
          </button>

          {/* Close (mobile only) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition md:hidden"
            aria-label="Close sidebar"
          >
            <Icons.x />
          </button>
        </div>

        {/* ── Scrollable menu ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-thin">
          {MENU_GROUPS.map((group) => (
            <div key={group.title} className="mb-1">
              {/* Group header (collapsed = dot only) */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={`
                  group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium
                  uppercase tracking-wider text-slate-500 hover:text-slate-300 transition
                  ${collapsed ? "md:justify-center md:px-0" : ""}
                `}
                title={collapsed ? group.title : undefined}
              >
                {collapsed ? (
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                ) : (
                  <>
                    <span className="truncate">{group.title}</span>
                    <span className={`ml-auto transition-transform duration-200 ${expandedGroups[group.title] ? "rotate-180" : ""}`}>
                      <Icons.chevronDown />
                    </span>
                  </>
                )}
              </button>

              {/* Items */}
              <div
                className={`
                  overflow-hidden transition-all duration-200 ease-in-out
                  ${expandedGroups[group.title] || collapsed ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}
                `}
              >
                <div className={`space-y-0.5 ${collapsed ? "md:px-0" : "px-0"}`}>
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href, item.exact);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNav}
                        title={collapsed ? item.label : undefined}
                        className={`
                          group/link flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-150
                          ${active
                            ? "bg-cyan-500/10 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                          }
                          ${collapsed ? "md:justify-center md:px-0" : ""}
                        `}
                      >
                        <span className={`shrink-0 ${active ? "text-cyan-400" : "text-slate-500"}`}>
                          {Icons[item.icon]()}
                        </span>
                        <span
                          className={`
                            truncate transition-opacity duration-200
                            ${collapsed ? "md:sr-only" : ""}
                          `}
                        >
                          {item.label}
                        </span>
                        {active && collapsed && (
                          <span className="absolute right-0 top-1/2 hidden h-4 w-0.5 -translate-y-1/2 rounded-full bg-cyan-400 md:block" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom: org + user ── */}
        <div className="shrink-0 border-t border-white/[0.06] px-2 py-3">
          {/* Org badge */}
          {currentOrgName && (
            <div
              className={`
                mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5
                ${collapsed ? "md:justify-center" : ""}
              `}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span
                className={`
                  truncate text-xs font-medium text-emerald-300
                  ${collapsed ? "md:sr-only" : ""}
                `}
              >
                {currentOrgName}
              </span>
            </div>
          )}

          {/* User section */}
          {status === "loading" ? (
            <div className={`flex items-center gap-2 px-2 py-1.5 ${collapsed ? "md:justify-center" : ""}`}>
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-800" />
            </div>
          ) : session?.user ? (
            <div className="group/user relative">
              <div
                className={`
                  flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.04] cursor-pointer
                  ${collapsed ? "md:justify-center" : ""}
                `}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-300">
                  {(session.user.name ?? session.user.email ?? "U").charAt(0).toUpperCase()}
                </div>
                <div className={`min-w-0 ${collapsed ? "md:sr-only" : ""}`}>
                  <p className="truncate text-sm font-medium text-slate-200">
                    {session.user.name ?? session.user.email}
                  </p>
                </div>
              </div>
              {/* Sign out tooltip / dropdown */}
              {!collapsed && (
                <div className="absolute bottom-full left-0 right-0 mb-1 hidden group-hover/user:block">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    Sign out
                  </button>
                </div>
              )}
              {collapsed && (
                <div className="absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 group-hover/user:block">
                  <div className="w-48 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
                    <p className="mb-2 truncate text-sm font-medium text-slate-200">
                      {session.user.name ?? session.user.email}
                    </p>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className={`
                flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400
                ${collapsed ? "md:justify-center md:px-2" : ""}
              `}
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              {!collapsed && <span>Sign in</span>}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

/* ── Active route matcher ── */
function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  // For nested routes, match if pathname starts with href
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

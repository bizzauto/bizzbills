"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useOrg } from "@/components/OrgProvider";
import { formatAmount } from "@/lib/currency";

type Summary = {
  totalProducts: number;
  totalStockUnits: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalIn: number;
  totalOut: number;
  totalAdjusted: number;
};

type Category = { name: string; count: number; stock: number; value: number };

type LowStockProduct = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  warehouses: { name: string; quantity: number }[];
};

type Movement = {
  id: string;
  productName: string;
  productSku: string;
  warehouseName: string;
  type: string;
  quantity: number;
  reference: string;
  notes: string;
  createdAt: string;
};

type MovementTrend = { period: string; in: number; out: number };

const today = () => new Date().toISOString().split("T")[0];
const defaultFrom = "2024-01-01";

export default function InventoryReportPage() {
  const { currentOrgCurrency } = useOrg();
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [trend, setTrend] = useState<MovementTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/inventory?fromDate=${fromDate}&toDate=${toDate}`
      );
      const d = await res.json();
      setSummary(d?.summary ?? null);
      setCategories(d?.categories ?? []);
      setLowStock(d?.lowStockProducts ?? []);
      setMovements(d?.recentMovements ?? []);
      setTrend(d?.movementTrend ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = useCallback(() => {
    const header = "Product,SKU,Category,Stock,Value\n";
    const rows = categories
      .map((c) => `${c.name},,${c.count},${c.stock},${c.value}`)
      .join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [categories]);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent-light">
              <Link href="/reports" className="hover:text-cyan-300">
                Reports
              </Link>{" "}
              / Inventory
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-default">
              Inventory Report
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-400">
              <span className="mb-0.5 block">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-field"
              />
            </label>
            <label className="text-xs text-slate-400">
              <span className="mb-0.5 block">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input-field"
              />
            </label>
            <button onClick={exportCSV} className="btn-secondary mt-4">
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-muted py-8 text-center text-sm">Loading…</p>
      ) : (
        <>
          {/* KPI Cards */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="kpi-card kpi-accent-cyan">
                <p className="text-muted text-xs">Total Products</p>
                <p className="text-default mt-1 text-2xl font-semibold">
                  {summary.totalProducts}
                </p>
              </div>
              <div className="kpi-card kpi-accent-green">
                <p className="text-muted text-xs">Stock Value</p>
                <p className="mt-1 text-2xl font-semibold text-cyan-300">
                  {formatAmount(summary.totalStockValue, currentOrgCurrency)}
                </p>
              </div>
              <div className="kpi-card kpi-accent-amber">
                <p className="text-muted text-xs">Low Stock Items</p>
                <p
                  className={`mt-1 text-2xl font-semibold ${summary.lowStockCount > 0 ? "text-amber-300" : "text-emerald-300"}`}
                >
                  {summary.lowStockCount}
                </p>
              </div>
              <div className="kpi-card kpi-accent-purple">
                <p className="text-muted text-xs">Out of Stock</p>
                <p
                  className={`mt-1 text-2xl font-semibold ${summary.outOfStockCount > 0 ? "text-red-300" : "text-emerald-300"}`}
                >
                  {summary.outOfStockCount}
                </p>
              </div>
            </div>
          )}

          {/* Movement Summary */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="section-card">
                <p className="text-muted text-xs">Stock In (period)</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">
                  +{summary.totalIn} units
                </p>
              </div>
              <div className="section-card">
                <p className="text-muted text-xs">Stock Out (period)</p>
                <p className="mt-1 text-xl font-semibold text-red-300">
                  -{summary.totalOut} units
                </p>
              </div>
              <div className="section-card">
                <p className="text-muted text-xs">Adjustments</p>
                <p className="mt-1 text-xl font-semibold text-amber-300">
                  {summary.totalAdjusted} units
                </p>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {categories.length > 0 && (
            <section className="section-card">
              <h2 className="text-default mb-4 text-lg font-semibold">
                Stock by Category
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-default text-muted">
                      <th className="p-3 font-medium">Category</th>
                      <th className="p-3 font-medium">Products</th>
                      <th className="p-3 font-medium text-right">
                        Stock Units
                      </th>
                      <th className="p-3 font-medium text-right">Value</th>
                      <th className="p-3 font-medium text-right">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => {
                      const totalVal = categories.reduce(
                        (s, cat) => s + cat.value,
                        0
                      );
                      const pct =
                        totalVal > 0 ? (c.value / totalVal) * 100 : 0;
                      return (
                        <tr
                          key={c.name}
                          className="border-t border-default hover:bg-card-hover"
                        >
                          <td className="p-3 text-default font-medium">
                            {c.name}
                          </td>
                          <td className="p-3 text-slate-300">{c.count}</td>
                          <td className="p-3 text-right text-slate-300">
                            {c.stock}
                          </td>
                          <td className="p-3 text-right text-default">
                            {formatAmount(c.value, currentOrgCurrency)}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-cyan-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Low Stock Alerts */}
          {lowStock.length > 0 && (
            <section className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/5 p-6">
              <h2 className="text-amber-300 mb-4 text-lg font-semibold">
                ⚠ Low Stock Alerts
              </h2>
              <div className="space-y-2">
                {lowStock.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-amber-500/10 bg-slate-950/50 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {p.name}{" "}
                        {p.sku && (
                          <span className="text-xs text-slate-500">
                            ({p.sku})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Min: {p.minStock} —{" "}
                        {p.warehouses
                          .map((w) => `${w.name}: ${w.quantity}`)
                          .join(", ")}
                      </p>
                    </div>
                    <Link
                      href={`/inventory/products/${p.id}`}
                      className="text-xs text-cyan-300 hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Movement Trend */}
          {trend.length > 0 && (
            <section className="section-card">
              <h2 className="text-default mb-4 text-lg font-semibold">
                Monthly Movement Trend
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-default text-muted">
                      <th className="p-3 font-medium">Month</th>
                      <th className="p-3 font-medium text-right">Stock In</th>
                      <th className="p-3 font-medium text-right">
                        Stock Out
                      </th>
                      <th className="p-3 font-medium text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((m) => (
                      <tr
                        key={m.period}
                        className="border-t border-default hover:bg-card-hover"
                      >
                        <td className="p-3 text-default">{m.period}</td>
                        <td className="p-3 text-right text-emerald-300">
                          +{m.in}
                        </td>
                        <td className="p-3 text-right text-red-300">
                          -{m.out}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${m.in - m.out >= 0 ? "text-emerald-300" : "text-red-300"}`}
                        >
                          {m.in - m.out >= 0 ? "+" : ""}
                          {m.in - m.out}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Recent Movements */}
          {movements.length > 0 && (
            <section className="section-card">
              <h2 className="text-default mb-4 text-lg font-semibold">
                Recent Stock Movements
              </h2>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-default text-muted">
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Product</th>
                      <th className="p-3 font-medium">Warehouse</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium text-right">Qty</th>
                      <th className="p-3 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr
                        key={m.id}
                        className="border-t border-default hover:bg-card-hover"
                      >
                        <td className="p-3 text-xs text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-3 text-default">
                          {m.productName}
                          {m.productSku && (
                            <span className="ml-1 text-xs text-slate-500">
                              ({m.productSku})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">
                          {m.warehouseName}
                        </td>
                        <td className="p-3">
                          <span
                            className={`badge ${
                              m.type === "in"
                                ? "badge-completed"
                                : m.type === "out"
                                  ? "badge-overdue"
                                  : "badge-pending"
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${m.type === "in" ? "text-emerald-300" : m.type === "out" ? "text-red-300" : "text-amber-300"}`}
                        >
                          {m.type === "in"
                            ? "+"
                            : m.type === "out"
                              ? "-"
                              : ""}
                          {m.quantity}
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {m.reference || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

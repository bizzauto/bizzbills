"use client";

import { useState, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type PriceListItem = {
  id?: string;
  productId?: string;
  productName: string;
  sku: string;
  unitPrice: number;
  minQuantity: number;
  maxQuantity: number | null;
};

type PriceList = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  items: PriceListItem[];
  createdAt: string;
};

type Discount = {
  id: string;
  name: string;
  type: string;
  value: number;
  minAmount: number;
  minQuantity: number;
  maxUses: number | null;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
};

// ── Empty form defaults ──────────────────────────────────────────────────────

const emptyPriceList = { name: "", description: "", isActive: true, isDefault: false, items: [] as PriceListItem[] };
const emptyDiscount = { name: "", type: "percentage", value: 0, minAmount: 0, minQuantity: 1, maxUses: "", startDate: "", endDate: "", isActive: true };

// ── Helper to format currency ────────────────────────────────────────────────

function fmtAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

// ── Tab button component ─────────────────────────────────────────────────────

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PricingManagementPage() {
  const [tab, setTab] = useState<"priceLists" | "discounts">("priceLists");

  // ── Price Lists state ──
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [showListForm, setShowListForm] = useState(false);
  const [listForm, setListForm] = useState(emptyPriceList);
  const [savingList, setSavingList] = useState(false);

  // ── Discounts state ──
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState(emptyDiscount);
  const [savingDiscount, setSavingDiscount] = useState(false);

  // ── Fetch data ──

  useEffect(() => {
    if (tab === "priceLists") {
      setLoadingLists(true);
      fetch("/api/pricing/price-lists")
        .then((r) => r.json())
        .then((d) => { setPriceLists(Array.isArray(d) ? d : []); setLoadingLists(false); })
        .catch(() => setLoadingLists(false));
    } else {
      setLoadingDiscounts(true);
      fetch("/api/pricing/discounts")
        .then((r) => r.json())
        .then((d) => { setDiscounts(Array.isArray(d) ? d : []); setLoadingDiscounts(false); })
        .catch(() => setLoadingDiscounts(false));
    }
  }, [tab]);

  // ── Price List CRUD ──

  function addListItem() {
    setListForm((prev) => ({
      ...prev,
      items: [...prev.items, { productName: "", sku: "", unitPrice: 0, minQuantity: 1, maxQuantity: null }],
    }));
  }

  function updateListItem(index: number, field: keyof PriceListItem, value: string | number | null) {
    setListForm((prev) => {
      const updated = prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      return { ...prev, items: updated };
    });
  }

  function removeListItem(index: number) {
    setListForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function handleCreatePriceList() {
    if (!listForm.name.trim()) return;
    setSavingList(true);
    try {
      const res = await fetch("/api/pricing/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listForm),
      });
      if (res.ok) {
        const created = await res.json();
        setPriceLists((prev) => [created, ...prev]);
        setListForm(emptyPriceList);
        setShowListForm(false);
      }
    } finally {
      setSavingList(false);
    }
  }

  // ── Discount CRUD ──

  async function handleCreateDiscount() {
    if (!discountForm.name.trim()) return;
    setSavingDiscount(true);
    try {
      const res = await fetch("/api/pricing/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...discountForm,
          value: Number(discountForm.value),
          minAmount: Number(discountForm.minAmount),
          minQuantity: Number(discountForm.minQuantity),
          maxUses: discountForm.maxUses ? Number(discountForm.maxUses) : null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setDiscounts((prev) => [created, ...prev]);
        setDiscountForm(emptyDiscount);
        setShowDiscountForm(false);
      }
    } finally {
      setSavingDiscount(false);
    }
  }

  // ── Render ──

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Header */}
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Pricing</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Price Lists &amp; Discounts</h1>
          </div>
          <div className="flex items-center gap-2">
            <TabButton label="Price Lists" active={tab === "priceLists"} onClick={() => setTab("priceLists")} />
            <TabButton label="Discounts" active={tab === "discounts"} onClick={() => setTab("discounts")} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PRICE LISTS TAB ═══════════════════════════════ */}
      {tab === "priceLists" && (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              {priceLists.length} price list{priceLists.length !== 1 ? "s" : ""}
            </h2>
            <button
              onClick={() => setShowListForm((v) => !v)}
              className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
            >
              {showListForm ? "Cancel" : "+ New Price List"}
            </button>
          </div>

          {/* Create form */}
          {showListForm && (
            <section className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-900/90 p-6 backdrop-blur space-y-4">
              <h3 className="text-sm font-semibold text-white">Create Price List</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={listForm.name}
                    onChange={(e) => setListForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Wholesale Prices"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={listForm.description}
                    onChange={(e) => setListForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={listForm.isActive}
                    onChange={(e) => setListForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="accent-cyan-500"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={listForm.isDefault}
                    onChange={(e) => setListForm((p) => ({ ...p, isDefault: e.target.checked }))}
                    className="accent-cyan-500"
                  />
                  Default
                </label>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-slate-400">Price Items</h4>
                  <button onClick={addListItem} className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300 transition">
                    + Add Item
                  </button>
                </div>

                {listForm.items.length === 0 && (
                  <p className="text-xs text-slate-600">No items added yet.</p>
                )}

                {listForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_100px_100px_80px_80px_32px] gap-2 mb-2 items-end">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Product Name *</label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateListItem(idx, "productName", e.target.value)}
                        placeholder="Product name"
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">SKU</label>
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => updateListItem(idx, "sku", e.target.value)}
                        placeholder="SKU"
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Unit Price *</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateListItem(idx, "unitPrice", Number(e.target.value))}
                        min={0}
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Min Qty</label>
                      <input
                        type="number"
                        value={item.minQuantity}
                        onChange={(e) => updateListItem(idx, "minQuantity", Number(e.target.value))}
                        min={1}
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Max Qty</label>
                      <input
                        type="number"
                        value={item.maxQuantity ?? ""}
                        onChange={(e) => updateListItem(idx, "maxQuantity", e.target.value ? Number(e.target.value) : null)}
                        min={0}
                        placeholder="∞"
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <button
                      onClick={() => removeListItem(idx)}
                      className="mb-1.5 text-xs text-red-400 hover:text-red-300 transition"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreatePriceList}
                disabled={savingList || !listForm.name.trim()}
                className="rounded-full bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition"
              >
                {savingList ? "Saving..." : "Create Price List"}
              </button>
            </section>
          )}

          {/* Price Lists grid */}
          {loadingLists ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : priceLists.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-10 text-center backdrop-blur">
              <p className="text-sm text-slate-500">No price lists yet. Create your first one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {priceLists.map((pl) => (
                <div key={pl.id} className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{pl.name}</h3>
                    <div className="flex items-center gap-2">
                      {pl.isDefault && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">Default</span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          pl.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {pl.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {pl.description && <p className="text-xs text-slate-400 mb-3">{pl.description}</p>}

                  {pl.items.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <div className="grid grid-cols-[1fr_80px] text-[10px] text-slate-500 font-medium">
                        <span>Product</span>
                        <span className="text-right">Price</span>
                      </div>
                      {pl.items.slice(0, 5).map((item, i) => (
                        <div key={i} className="grid grid-cols-[1fr_80px] text-xs">
                          <span className="text-slate-300 truncate">{item.productName}{item.sku ? ` (${item.sku})` : ""}</span>
                          <span className="text-right text-white font-medium">{fmtAmount(item.unitPrice)}</span>
                        </div>
                      ))}
                      {pl.items.length > 5 && (
                        <p className="text-[10px] text-slate-500 mt-1">+{pl.items.length - 5} more items</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 mt-2">No items</p>
                  )}

                  <p className="text-[10px] text-slate-600 mt-3">
                    Created {new Date(pl.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════ DISCOUNTS TAB ═════════════════════════════════ */}
      {tab === "discounts" && (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              {discounts.length} discount{discounts.length !== 1 ? "s" : ""}
            </h2>
            <button
              onClick={() => setShowDiscountForm((v) => !v)}
              className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
            >
              {showDiscountForm ? "Cancel" : "+ New Discount"}
            </button>
          </div>

          {/* Create form */}
          {showDiscountForm && (
            <section className="rounded-[1.5rem] border border-cyan-500/30 bg-slate-900/90 p-6 backdrop-blur space-y-4">
              <h3 className="text-sm font-semibold text-white">Create Discount</h3>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Summer Sale 20%"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type *</label>
                  <select
                    value={discountForm.type}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Value * {discountForm.type === "percentage" ? "(%)" : discountForm.type === "fixed" ? "(Amount)" : "(Buy qty)"}
                  </label>
                  <input
                    type="number"
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, value: Number(e.target.value) }))}
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Min Amount</label>
                  <input
                    type="number"
                    value={discountForm.minAmount}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, minAmount: Number(e.target.value) }))}
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    value={discountForm.minQuantity}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, minQuantity: Number(e.target.value) }))}
                    min={1}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={discountForm.maxUses}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, maxUses: e.target.value }))}
                    min={1}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={discountForm.startDate}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={discountForm.endDate}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={discountForm.isActive}
                      onChange={(e) => setDiscountForm((p) => ({ ...p, isActive: e.target.checked }))}
                      className="accent-cyan-500"
                    />
                    Active
                  </label>
                </div>
              </div>

              <button
                onClick={handleCreateDiscount}
                disabled={savingDiscount || !discountForm.name.trim()}
                className="rounded-full bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition"
              >
                {savingDiscount ? "Saving..." : "Create Discount"}
              </button>
            </section>
          )}

          {/* Discounts list */}
          {loadingDiscounts ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : discounts.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-10 text-center backdrop-blur">
              <p className="text-sm text-slate-500">No discounts yet. Create your first one to get started.</p>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 backdrop-blur overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium text-right">Value</th>
                      <th className="p-3 font-medium text-right">Min Amount</th>
                      <th className="p-3 font-medium text-right">Min Qty</th>
                      <th className="p-3 font-medium">Usage</th>
                      <th className="p-3 font-medium">Period</th>
                      <th className="p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map((d) => (
                      <tr key={d.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-3 text-white font-medium">{d.name}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                            {d.type === "percentage" ? "Percentage" : d.type === "fixed" ? "Fixed" : "Buy X Get Y"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-white font-medium">
                          {d.type === "percentage" ? `${d.value}%` : d.type === "fixed" ? fmtAmount(d.value) : `Buy ${d.value}`}
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {d.minAmount > 0 ? fmtAmount(d.minAmount) : "—"}
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {d.minQuantity > 1 ? d.minQuantity : "—"}
                        </td>
                        <td className="p-3 text-slate-300">
                          {d.usedCount}
                          {d.maxUses ? ` / ${d.maxUses}` : ""}
                        </td>
                        <td className="p-3 text-xs text-slate-400">
                          {d.startDate ? new Date(d.startDate).toLocaleDateString() : "—"}
                          {d.startDate && d.endDate ? " - " : ""}
                          {d.endDate ? new Date(d.endDate).toLocaleDateString() : ""}
                          {!d.startDate && !d.endDate && "No limit"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              d.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {d.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

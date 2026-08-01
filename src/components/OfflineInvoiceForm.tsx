"use client";

import { useState, useCallback } from "react";
import { saveOfflineInvoice, type OfflineInvoice } from "@/lib/offline-db";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type InvoiceFormData = {
  customerName: string;
  items: LineItem[];
  notes: string;
};

const EMPTY_ITEM: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 18,
};

function generateId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function OfflineInvoiceForm({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState<InvoiceFormData>({
    customerName: "",
    items: [{ ...EMPTY_ITEM }],
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const updateItem = useCallback(
    (index: number, updates: Partial<LineItem>) => {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, i) =>
          i === index ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const subtotal = form.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxTotal = form.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
    0
  );
  const total = subtotal + taxTotal;

  const handleSave = useCallback(async () => {
    if (!form.customerName.trim()) return;

    setSaving(true);
    try {
      const invoice: OfflineInvoice = {
        id: generateId(),
        data: {
          customerName: form.customerName.trim(),
          items: form.items.filter((item) => item.description.trim()),
          notes: form.notes.trim(),
        },
        createdAt: new Date().toISOString(),
        synced: false,
      };

      await saveOfflineInvoice(invoice);
      setSaved(true);
      onSaved?.();

      // Reset form after 2 seconds
      setTimeout(() => {
        setForm({
          customerName: "",
          items: [{ ...EMPTY_ITEM }],
          notes: "",
        });
        setSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save offline invoice:", error);
    } finally {
      setSaving(false);
    }
  }, [form, onSaved]);

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">📴</span>
        <div>
          <h3 className="text-lg font-semibold text-default">
            Create Invoice Offline
          </h3>
          <p className="text-sm text-muted">
            This invoice will be saved locally and synced when you&apos;re back
            online.
          </p>
        </div>
      </div>

      {/* Customer Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-default">
          Customer Name *
        </label>
        <input
          type="text"
          value={form.customerName}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, customerName: e.target.value }))
          }
          className="input mt-1"
          placeholder="Enter customer name"
          required
        />
      </div>

      {/* Line Items */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-default">
          Items
        </label>
        <div className="space-y-3">
          {form.items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] p-3 sm:flex-row"
            >
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateItem(index, { description: e.target.value })
                }
                className="input flex-1"
                placeholder="Item description"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, { quantity: Number(e.target.value) || 1 })
                }
                className="input w-20"
                min="1"
                placeholder="Qty"
              />
              <input
                type="number"
                value={item.unitPrice}
                onChange={(e) =>
                  updateItem(index, {
                    unitPrice: Number(e.target.value) || 0,
                  })
                }
                className="input w-24"
                min="0"
                step="0.01"
                placeholder="Price"
              />
              <select
                value={item.taxRate}
                onChange={(e) =>
                  updateItem(index, { taxRate: Number(e.target.value) })
                }
                className="input w-24"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
              {form.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-danger hover:text-danger/80 px-2 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 text-sm font-medium text-accent hover:text-accent/80"
        >
          + Add Item
        </button>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-default">
          Notes (optional)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, notes: e.target.value }))
          }
          className="input mt-1 resize-none"
          rows={2}
          placeholder="Additional notes..."
        />
      </div>

      {/* Summary */}
      <div className="mb-4 space-y-1 rounded-lg bg-[var(--input-bg)] p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="text-default">₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Tax</span>
          <span className="text-default">₹{taxTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--card-border)] pt-1">
          <span className="font-medium text-default">Total</span>
          <span className="font-semibold text-default">₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !form.customerName.trim()}
        className="btn-primary w-full justify-center py-3"
      >
        {saving
          ? "Saving..."
          : saved
            ? "✓ Saved Locally"
            : "Save Invoice Offline"}
      </button>

      {saved && (
        <div className="mt-3 rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
          Invoice saved locally. It will sync automatically when you&apos;re
          back online.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { BottomSheet } from "./BottomSheet";

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

const TAX_RATES = [
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 },
];

const EMPTY_ITEM: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 18,
};

export function MobileInvoiceForm() {
  const [form, setForm] = useState<InvoiceFormData>({
    customerName: "",
    items: [{ ...EMPTY_ITEM }],
    notes: "",
  });
  const [showItemSheet, setShowItemSheet] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const addItem = useCallback(() => {
    setEditingItemIndex(form.items.length);
    setShowItemSheet(true);
  }, [form.items.length]);

  const editItem = useCallback((index: number) => {
    setEditingItemIndex(index);
    setShowItemSheet(true);
  }, []);

  const removeItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const saveItem = useCallback(
    (item: LineItem) => {
      if (editingItemIndex === null) return;

      setForm((prev) => ({
        ...prev,
        items:
          editingItemIndex < prev.items.length
            ? prev.items.map((i, idx) =>
                idx === editingItemIndex ? item : i
              )
            : [...prev.items, item],
      }));
      setShowItemSheet(false);
      setEditingItemIndex(null);
    },
    [editingItemIndex]
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

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-default">New Invoice</h1>
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4 space-y-4">
        {/* Customer Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-default">
            Customer Name
          </label>
          <input
            type="text"
            value={form.customerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, customerName: e.target.value }))
            }
            className="input min-h-[48px] w-full text-base"
            placeholder="Enter customer name"
          />
        </div>

        {/* Items List */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-default">Items</label>
            <button
              type="button"
              onClick={addItem}
              className="min-h-[44px] min-w-[44px] rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
                onClick={() => editItem(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-default">
                      {item.description || "Untitled Item"}
                    </p>
                    <p className="text-sm text-muted">
                      {item.quantity} × ₹{item.unitPrice.toFixed(2)} + {item.taxRate}% tax
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-default">
                      ₹
                      {(
                        item.quantity *
                        item.unitPrice *
                        (1 + item.taxRate / 100)
                      ).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(index);
                      }}
                      className="text-sm text-danger"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-2 block text-sm font-medium text-default">
            Notes (optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="input min-h-[80px] w-full resize-none text-base"
            placeholder="Add notes..."
          />
        </div>
      </div>

      {/* Fixed Bottom Summary */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <div className="mb-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-default">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Tax</span>
            <span className="text-default">₹{taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--card-border)] pt-1">
            <span className="font-semibold text-default">Total</span>
            <span className="text-lg font-bold text-accent">
              ₹{total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Item Edit Bottom Sheet */}
      <BottomSheet
        isOpen={showItemSheet}
        onClose={() => {
          setShowItemSheet(false);
          setEditingItemIndex(null);
        }}
        title={
          editingItemIndex !== null &&
          editingItemIndex < form.items.length
            ? "Edit Item"
            : "Add Item"
        }
      >
        <ItemEditForm
          item={
            editingItemIndex !== null &&
            editingItemIndex < form.items.length
              ? form.items[editingItemIndex]
              : EMPTY_ITEM
          }
          onSave={saveItem}
          onCancel={() => {
            setShowItemSheet(false);
            setEditingItemIndex(null);
          }}
        />
      </BottomSheet>
    </div>
  );
}

function ItemEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: LineItem;
  onSave: (item: LineItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(item);

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-default">
          Item Description
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
          className="input min-h-[48px] w-full text-base"
          placeholder="Enter item name"
        />
      </div>

      {/* Quantity */}
      <div>
        <label className="mb-2 block text-sm font-medium text-default">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                quantity: Math.max(1, prev.quantity - 1),
              }))
            }
            className="min-h-[48px] min-w-[48px] rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] text-xl font-bold text-default"
          >
            −
          </button>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                quantity: Math.max(1, Number(e.target.value) || 1),
              }))
            }
            className="input min-h-[48px] w-20 text-center text-lg"
            min="1"
          />
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({ ...prev, quantity: prev.quantity + 1 }))
            }
            className="min-h-[48px] min-w-[48px] rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] text-xl font-bold text-default"
          >
            +
          </button>
        </div>
      </div>

      {/* Unit Price */}
      <div>
        <label className="mb-2 block text-sm font-medium text-default">
          Unit Price (₹)
        </label>
        <input
          type="number"
          value={form.unitPrice}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              unitPrice: Number(e.target.value) || 0,
            }))
          }
          className="input min-h-[48px] w-full text-lg"
          min="0"
          step="0.01"
          placeholder="0.00"
        />
      </div>

      {/* Tax Rate */}
      <div>
        <label className="mb-2 block text-sm font-medium text-default">
          GST Rate
        </label>
        <div className="flex flex-wrap gap-2">
          {TAX_RATES.map((rate) => (
            <button
              key={rate.value}
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, taxRate: rate.value }))
              }
              className={`min-h-[48px] min-w-[60px] rounded-xl border px-4 py-3 text-sm font-medium transition ${
                form.taxRate === rate.value
                  ? "border-accent bg-accent text-white"
                  : "border-[var(--card-border)] bg-[var(--badge-bg)] text-default"
              }`}
            >
              {rate.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl bg-[var(--input-bg)] p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Item Total</span>
          <span className="font-semibold text-default">
            ₹
            {(
              form.quantity *
              form.unitPrice *
              (1 + form.taxRate / 100)
            ).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] font-medium text-default"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          className="min-h-[48px] flex-1 rounded-xl bg-accent font-medium text-white"
        >
          Save Item
        </button>
      </div>
    </div>
  );
}

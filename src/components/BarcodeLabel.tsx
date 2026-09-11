"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * Reusable barcode label for product identification.
 *
 * Renders a scannable Code128 barcode + optional product info.
 * Uses a <canvas> element so the barcode renders crisp at any DPI
 * and prints cleanly (no SVG scaling issues).
 *
 * Props:
 *   value   — barcode value (SKU, EAN, etc.). Falls back to "0000000000" if empty.
 *   width   — module width in pixels (default 2, higher = wider barcode).
 *   height  — bar height in pixels (default 60).
 *   displayValue — show human-readable value below barcode (default true).
 *   fontSize — font size for the displayed value (default 14).
 *   showLabel — render product name + price below the barcode.
 *   productName — product name text.
 *   price — formatted price string (e.g. "₹500").
 *   hsn — HSN/SAC code.
 *   unit — unit of measure.
 *   barcodeOnly — if true, render only the barcode (no text below).
 *   className — outer div class.
 *   id — canvas element id (for print).
 */
export function BarcodeLabel({
  value,
  width = 2,
  height = 60,
  displayValue = true,
  fontSize = 14,
  showLabel = false,
  productName,
  price,
  hsn,
  unit,
  barcodeOnly = false,
  className = "",
  id = "barcode",
}: {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  showLabel?: boolean;
  productName?: string;
  price?: string;
  hsn?: string;
  unit?: string;
  barcodeOnly?: boolean;
  className?: string;
  id?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    JsBarcode(canvasRef.current, value || "0000000000", {
      format: "CODE128",
      width,
      height,
      displayValue,
      fontSize,
      font: "monospace",
      textMargin: 2,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });
  }, [value, width, height, displayValue, fontSize]);

  return (
    <div className={`inline-block ${className}`}>
      <canvas ref={canvasRef} id={id} />
      {showLabel && !barcodeOnly && (
        <div style={{ fontSize: "11px", color: "#1e293b", marginTop: "4px" }}>
          {productName && <p style={{ fontWeight: 600, margin: 0 }}>{productName}</p>}
          {(price || hsn || unit) && (
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "10px" }}>
              {price && <span>{price}</span>}
              {price && hsn && <span> • </span>}
              {hsn && <span>HSN: {hsn}</span>}
              {(price || hsn) && unit && <span> • </span>}
              {unit && <span>{unit}</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

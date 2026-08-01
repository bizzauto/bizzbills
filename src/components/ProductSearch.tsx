"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Product = {
  id: string;
  name: string;
  sku?: string;
  sellingPrice: number;
  taxRate: number;
  unit: string;
};

type ProductSearchProps = {
  onSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
};

export function ProductSearch({
  onSelect,
  placeholder = "Search products (type 2+ characters)...",
  className = "",
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchProducts = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      }
    } catch {
      console.error("Failed to search products");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setHighlightIndex(-1);

      // Debounce search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        searchProducts(value);
      }, 300);
    },
    [searchProducts]
  );

  const handleSelect = useCallback(
    (product: Product) => {
      setQuery(product.name);
      setIsOpen(false);
      setResults([]);
      onSelect(product);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < results.length) {
            handleSelect(results[highlightIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [isOpen, results, highlightIndex, handleSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="input w-full pr-10"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-lg max-h-60 overflow-y-auto"
        >
          {results.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              className={`w-full px-4 py-3 text-left transition ${
                index === highlightIndex
                  ? "bg-accent/10"
                  : "hover:bg-[var(--badge-bg)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-default">{product.name}</p>
                  {product.sku && (
                    <p className="text-xs text-muted">SKU: {product.sku}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-default">
                    ₹{product.sellingPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted">{product.taxRate}% GST</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center shadow-lg">
          <p className="text-sm text-muted">No products found</p>
          <p className="text-xs text-muted mt-1">
            Try a different search term
          </p>
        </div>
      )}
    </div>
  );
}

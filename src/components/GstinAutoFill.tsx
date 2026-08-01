"use client";

import { useState, useCallback, useEffect } from "react";
import { parseGstin, type GstinInfo } from "@/lib/gstin-lookup";

type GstinAutoFillProps = {
  value: string;
  onChange: (gstin: string) => void;
  onStateDetected?: (state: string) => void;
  onNameDetected?: (name: string) => void;
  className?: string;
  placeholder?: string;
};

export function GstinAutoFill({
  value,
  onChange,
  onStateDetected,
  onNameDetected,
  className = "",
  placeholder = "22AAAAA0000A1Z5",
}: GstinAutoFillProps) {
  const [info, setInfo] = useState<GstinInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (value && value.length >= 2) {
      const parsed = parseGstin(value);
      setInfo(parsed);

      if (parsed.isValid && parsed.stateName) {
        onStateDetected?.(parsed.stateName);
      }
    } else {
      setInfo(null);
    }
  }, [value, onStateDetected]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`input w-full pr-10 ${
            value.length === 15
              ? info?.isValid
                ? "border-success/50 focus:border-success"
                : "border-danger/50 focus:border-danger"
              : ""
          }`}
          maxLength={15}
        />
        {value.length === 15 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {info?.isValid ? (
              <span className="text-success">✓</span>
            ) : (
              <span className="text-danger">✕</span>
            )}
          </div>
        )}
      </div>

      {/* GSTIN Info Card */}
      {info && value.length >= 2 && (
        <div
          className={`mt-2 rounded-lg border p-3 text-xs ${
            info.isValid
              ? "border-success/20 bg-success/5"
              : "border-warning/20 bg-warning/5"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-medium text-default">
                {info.stateName}
                <span className="ml-2 text-muted">({info.stateCode})</span>
              </p>
              {info.panNumber && (
                <p className="text-muted">
                  PAN: <span className="font-mono">{info.panNumber}</span>
                </p>
              )}
              <p className="text-muted">Type: {info.entityType}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-accent hover:text-accent/80"
            >
              {showDetails ? "Less" : "More"}
            </button>
          </div>

          {showDetails && (
            <div className="mt-2 border-t border-[var(--card-border)] pt-2 space-y-1">
              <p className="text-muted">
                State Code: <span className="font-mono">{info.stateCode}</span>
              </p>
              <p className="text-muted">
                Entity: <span className="font-mono">{info.entityType}</span>
              </p>
              <p className="text-muted">
                GSTIN: <span className="font-mono">{info.gstin}</span>
              </p>
            </div>
          )}

          {info.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {info.errors.map((error, i) => (
                <p key={i} className="text-danger text-[10px]">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Fill Button */}
      {info?.isValid && (
        <button
          type="button"
          onClick={() => {
            // Fetch party details from GSTIN (simulated)
            onStateDetected?.(info.stateName);
            onNameDetected?.(`Party ${info.panNumber}`);
          }}
          className="mt-2 w-full rounded-lg border border-dashed border-accent/30 p-2 text-xs text-accent transition hover:border-accent/50 hover:bg-accent/5"
        >
          Auto-fill from GSTIN
        </button>
      )}
    </div>
  );
}

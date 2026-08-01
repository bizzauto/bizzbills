"use client";

import { useState, useEffect, useCallback } from "react";
import { getOfflineInvoices, getSyncQueue } from "@/lib/offline-db";

type SyncStatus = "online" | "offline" | "syncing" | "error";

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatus>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setStatus("online");
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check pending items
  const checkPending = useCallback(async () => {
    try {
      const offlineInvoices = await getOfflineInvoices();
      const syncQueue = await getSyncQueue();
      setPendingCount(offlineInvoices.length + syncQueue.length);
    } catch {
      // IndexedDB not available
    }
  }, []);

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkPending]);

  // Listen for sync events from service worker
  useEffect(() => {
    const handleSyncStart = () => setStatus("syncing");
    const handleSyncComplete = () => {
      setStatus("online");
      setLastSync(new Date().toLocaleTimeString());
      checkPending();
    };
    const handleSyncError = () => setStatus("error");

    navigator.serviceWorker?.addEventListener("message", (event) => {
      switch (event.data.type) {
        case "SYNC_START":
          handleSyncStart();
          break;
        case "SYNC_COMPLETE":
          handleSyncComplete();
          break;
        case "SYNC_ERROR":
          handleSyncError();
          break;
      }
    });
  }, [checkPending]);

  const triggerSync = useCallback(async () => {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-invoices");
      setStatus("syncing");
    }
  }, []);

  if (status === "online" && pendingCount === 0) {
    return null; // Don't show anything when online with no pending items
  }

  const statusConfig = {
    online: {
      icon: "🟢",
      text: "Online",
      className: "bg-success/10 border-success/20 text-success",
    },
    offline: {
      icon: "🔴",
      text: "Offline",
      className: "bg-danger/10 border-danger/20 text-danger",
    },
    syncing: {
      icon: "🔄",
      text: "Syncing...",
      className: "bg-accent/10 border-accent/20 text-accent",
    },
    error: {
      icon: "⚠️",
      text: "Sync Error",
      className: "bg-warning/10 border-warning/20 text-warning",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${config.className}`}
    >
      <span className="text-lg">{config.icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{config.text}</span>
        {pendingCount > 0 && (
          <span className="text-xs opacity-75">
            {pendingCount} item{pendingCount !== 1 ? "s" : ""} pending
          </span>
        )}
        {lastSync && (
          <span className="text-xs opacity-75">Last sync: {lastSync}</span>
        )}
      </div>
      {status === "offline" && pendingCount > 0 && (
        <button
          type="button"
          onClick={triggerSync}
          className="ml-2 rounded-lg bg-white/20 px-3 py-1 text-xs font-medium transition hover:bg-white/30"
        >
          Sync When Online
        </button>
      )}
    </div>
  );
}

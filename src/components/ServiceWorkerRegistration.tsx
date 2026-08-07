"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let updateTimer: ReturnType<typeof setInterval> | undefined;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        updateTimer = setInterval(() => registration.update(), 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error("SW registration failed:", error);
      });

    return () => {
      if (updateTimer) clearInterval(updateTimer);
    };
  }, []);

  return null;
}

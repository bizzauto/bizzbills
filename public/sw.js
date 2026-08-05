const CACHE_NAME = "bizzbills-v2";
const STATIC_CACHE = "bizzbills-static-v2";
const DYNAMIC_CACHE = "bizzbills-dynamic-v2";

// Static assets to pre-cache
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/invoices",
  "/parties",
  "/products",
  "/settings",
  "/offline",
];

// Install event - pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Never cache auth routes (sessions/credentials)
  if (url.pathname.startsWith("/auth/")) return;

  // API data calls: network-first with cache fallback (offline read access)
  if (url.pathname.startsWith("/api/")) {
    // Skip auth/session and admin endpoints — never cache sensitive data
    if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/api/admin/")) return;

    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok && networkResponse.type === "basic") {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ error: "Offline" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              })
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update in background
        event.waitUntil(
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, networkResponse.clone());
                });
              }
            })
            .catch(() => {})
        );
        return cachedResponse;
      }

      // Not in cache, try network
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match("/offline");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

// Background sync for offline operations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-invoices") {
    event.waitUntil(syncOfflineInvoices());
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/icon.svg",
    badge: "/icon.svg",
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "BizzBills", options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let url = "/dashboard";
  if (action === "view" && data.url) {
    url = data.url;
  } else if (action === "dismiss") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      self.clients.openWindow(url);
    })
  );
});

async function syncOfflineInvoices() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_START" });
  });

  try {
    // Open IndexedDB and get pending invoices
    const db = await openDB();
    const tx = db.transaction("offlineInvoices", "readwrite");
    const store = tx.objectStore("offlineInvoices");
    const request = store.getAll();

    request.onsuccess = async () => {
      const invoices = request.result;
      for (const invoice of invoices) {
        try {
          const response = await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(invoice.data),
          });

          if (response.ok) {
            // Remove from IndexedDB after successful sync
            store.delete(invoice.id);
          }
        } catch (error) {
          console.error("Failed to sync invoice:", error);
        }
      }

      clients.forEach((client) => {
        client.postMessage({ type: "SYNC_COMPLETE" });
      });
    };
  } catch (error) {
    console.error("Sync failed:", error);
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_ERROR", error: error.message });
    });
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BizzBillsOffline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("offlineInvoices")) {
        db.createObjectStore("offlineInvoices", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };
  });
}

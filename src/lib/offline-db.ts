/**
 * IndexedDB helper for offline invoice operations
 */

const DB_NAME = "BizzBillsOffline";
const DB_VERSION = 1;

export interface OfflineInvoice {
  id: string;
  data: {
    customerName: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
    notes?: string;
  };
  createdAt: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: "invoice" | "payment" | "party";
  data: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("offlineInvoices")) {
        const store = db.createObjectStore("offlineInvoices", { keyPath: "id" });
        store.createIndex("synced", "synced", { unique: false });
      }

      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };
  });
}

// Save invoice offline
export async function saveOfflineInvoice(invoice: OfflineInvoice): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("offlineInvoices", "readwrite");
  const store = tx.objectStore("offlineInvoices");

  return new Promise((resolve, reject) => {
    const request = store.put(invoice);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all offline invoices
export async function getOfflineInvoices(): Promise<OfflineInvoice[]> {
  const db = await openDB();
  const tx = db.transaction("offlineInvoices", "readonly");
  const store = tx.objectStore("offlineInvoices");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get unsynced invoices
export async function getUnsyncedInvoices(): Promise<OfflineInvoice[]> {
  const db = await openDB();
  const tx = db.transaction("offlineInvoices", "readonly");
  const store = tx.objectStore("offlineInvoices");
  const index = store.index("synced");

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(false));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Mark invoice as synced
export async function markInvoiceSynced(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("offlineInvoices", "readwrite");
  const store = tx.objectStore("offlineInvoices");

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const invoice = getRequest.result;
      if (invoice) {
        invoice.synced = true;
        store.put(invoice);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Delete offline invoice
export async function deleteOfflineInvoice(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("offlineInvoices", "readwrite");
  const store = tx.objectStore("offlineInvoices");

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Add to sync queue
export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");

  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get sync queue
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  const tx = db.transaction("syncQueue", "readonly");
  const store = tx.objectStore("syncQueue");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove from sync queue
export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear sync queue
export async function clearSyncQueue(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");

  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * IndexedDB helpers for POS offline storage.
 *
 * Stores:
 *  - pendingOrders: orders created while offline, waiting to sync
 *  - menuCache: cached menu items + categories for offline order creation
 *  - tableCache: cached tables for offline reference
 *
 * Uses raw IndexedDB API (no external deps) with thin promise wrappers.
 */

const DB_NAME = "comtammatu-pos";
const DB_VERSION = 1;

// Store names
export const STORES = {
  PENDING_ORDERS: "pendingOrders",
  MENU_CACHE: "menuCache",
  TABLE_CACHE: "tableCache",
} as const;

export interface PendingOrder {
  /** Client-generated UUID for dedup */
  clientId: string;
  /** ISO timestamp when created offline */
  createdAt: string;
  /** Order payload matching createOrder input */
  payload: {
    table_id?: number | null;
    type: string;
    notes?: string;
    guest_count?: number | null;
    terminal_id: number;
    items: {
      menu_item_id: number;
      variant_id?: number | null;
      quantity: number;
      notes?: string;
      side_items?: { menu_item_id: number; quantity: number; notes?: string }[];
    }[];
  };
  /** Number of sync attempts so far */
  attempts: number;
  /** Last sync error message, if any */
  lastError?: string;
}

export interface MenuCacheEntry {
  key: string; // "menu" or "categories"
  data: unknown;
  cachedAt: string;
}

export interface TableCacheEntry {
  key: string; // "tables"
  data: unknown;
  cachedAt: string;
}

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.PENDING_ORDERS)) {
        db.createObjectStore(STORES.PENDING_ORDERS, { keyPath: "clientId" });
      }
      if (!db.objectStoreNames.contains(STORES.MENU_CACHE)) {
        db.createObjectStore(STORES.MENU_CACHE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.TABLE_CACHE)) {
        db.createObjectStore(STORES.TABLE_CACHE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function tx(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Pending Orders
// ---------------------------------------------------------------------------

export async function addPendingOrder(order: PendingOrder): Promise<void> {
  const store = await tx(STORES.PENDING_ORDERS, "readwrite");
  await req(store.put(order));
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const store = await tx(STORES.PENDING_ORDERS, "readonly");
  return req(store.getAll());
}

export async function removePendingOrder(clientId: string): Promise<void> {
  const store = await tx(STORES.PENDING_ORDERS, "readwrite");
  await req(store.delete(clientId));
}

export async function updatePendingOrder(order: PendingOrder): Promise<void> {
  const store = await tx(STORES.PENDING_ORDERS, "readwrite");
  await req(store.put(order));
}

export async function clearPendingOrders(): Promise<void> {
  const store = await tx(STORES.PENDING_ORDERS, "readwrite");
  await req(store.clear());
}

export async function getPendingOrderCount(): Promise<number> {
  const store = await tx(STORES.PENDING_ORDERS, "readonly");
  return req(store.count());
}

// ---------------------------------------------------------------------------
// Menu Cache
// ---------------------------------------------------------------------------

export async function cacheMenuData(
  key: string,
  data: unknown,
): Promise<void> {
  const store = await tx(STORES.MENU_CACHE, "readwrite");
  const entry: MenuCacheEntry = {
    key,
    data,
    cachedAt: new Date().toISOString(),
  };
  await req(store.put(entry));
}

export async function getCachedMenuData(
  key: string,
): Promise<MenuCacheEntry | undefined> {
  const store = await tx(STORES.MENU_CACHE, "readonly");
  return req(store.get(key));
}

// ---------------------------------------------------------------------------
// Table Cache
// ---------------------------------------------------------------------------

export async function cacheTableData(
  key: string,
  data: unknown,
): Promise<void> {
  const store = await tx(STORES.TABLE_CACHE, "readwrite");
  const entry: TableCacheEntry = {
    key,
    data,
    cachedAt: new Date().toISOString(),
  };
  await req(store.put(entry));
}

export async function getCachedTableData(
  key: string,
): Promise<TableCacheEntry | undefined> {
  const store = await tx(STORES.TABLE_CACHE, "readonly");
  return req(store.get(key));
}

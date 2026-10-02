// Trade screenshots live in IndexedDB (quota: hundreds of MB), keyed by trade id,
// instead of inline as base64 in the `trace_trades` localStorage value (~5MB cap).
// The tradeStore keeps screenshots in memory as before; only persistence moved here.
//
// Every call fails soft (resolves to null/[] instead of throwing) so a trade can
// always be saved even when IndexedDB is unavailable (private mode, old browser).

const DB_NAME = 'trace_images';
const STORE = 'trade_screenshots';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  return openDB().then(db => {
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

/** Store (or clear, when empty) the screenshots for one trade. */
export async function putTradeImages(tradeId: string, images: string[]): Promise<void> {
  if (!images || images.length === 0) { await deleteTradeImages(tradeId); return; }
  await run('readwrite', store => store.put(images, tradeId));
}

/** Read one trade's screenshots (empty array if none / unavailable). */
export async function getTradeImages(tradeId: string): Promise<string[]> {
  const res = await run<string[]>('readonly', store => store.get(tradeId));
  return res ?? [];
}

/** Remove one trade's screenshots. */
export async function deleteTradeImages(tradeId: string): Promise<void> {
  await run('readwrite', store => store.delete(tradeId));
}

/** Read every stored trade's screenshots as { tradeId: dataUrls[] }. */
export function getAllTradeImages(): Promise<Record<string, string[]>> {
  return openDB().then(db => {
    if (!db) return {};
    return new Promise<Record<string, string[]>>((resolve) => {
      const out: Record<string, string[]> = {};
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) { out[String(cursor.key)] = cursor.value as string[]; cursor.continue(); }
          else resolve(out);
        };
        req.onerror = () => resolve(out);
      } catch {
        resolve(out);
      }
    });
  });
}

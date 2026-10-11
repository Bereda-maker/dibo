"use client";

export type OfflineMutation = { id: string; path: string; method: string; body: unknown; createdAt: number };

type CacheRecord = { key: string; data: unknown; updatedAt: number };
const DB_NAME = "dibora-offline-v2";
const DB_VERSION = 1;
const CACHE_STORE = "responses";
const QUEUE_STORE = "mutations";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export function isOfflineCacheable(path: string) {
  return /^\/content\/(notes|subjects|topics)|^\/practice\/questions|^\/exams(?:\/|$)|^\/attempts\//.test(path);
}

export function isOfflineQueueable(path: string, method: string) {
  return method !== "GET" && (/^\/attempts\/[^/]+\/(answers|submit)$/.test(path) || path === "/practice/answer" || /^\/notes\/[^/]+\/complete$/.test(path) || path === "/bookmarks");
}

export async function readOffline<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(CACHE_STORE, "readonly").objectStore(CACHE_STORE).get(key);
    request.onsuccess = () => resolve((request.result as CacheRecord | undefined)?.data as T ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function writeOffline(key: string, data: unknown) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const request = db.transaction(CACHE_STORE, "readwrite").objectStore(CACHE_STORE).put({ key, data, updatedAt: Date.now() } satisfies CacheRecord);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

export async function queueOfflineMutation(path: string, method: string, body: unknown) {
  const db = await openDb();
  if (!db) return false;
  const mutation: OfflineMutation = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, path, method, body, createdAt: Date.now() };
  await new Promise<void>((resolve) => {
    const request = db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE).put(mutation);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
  return true;
}

async function queuedMutations() {
  const db = await openDb();
  if (!db) return [] as OfflineMutation[];
  return new Promise<OfflineMutation[]>((resolve) => {
    const request = db.transaction(QUEUE_STORE, "readonly").objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve((request.result as OfflineMutation[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => resolve([]);
  });
}

async function removeMutation(id: string) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const request = db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

export async function drainOfflineMutations(send: (mutation: OfflineMutation) => Promise<void>) {
  for (const mutation of await queuedMutations()) {
    try {
      await send(mutation);
      await removeMutation(mutation.id);
    } catch {
      break;
    }
  }
}

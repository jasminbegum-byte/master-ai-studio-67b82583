import { useSyncExternalStore } from "react";

/**
 * Browser-safe local persistence (localStorage) with an in-memory cache and
 * subscription support. On the server every read returns the given fallback.
 */

export const STORAGE_PREFIX = "master-ai-studio:v1:";

type Listener = () => void;

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();
let crossTabBound = false;

export class StorageWriteError extends Error {}

function bindCrossTab() {
  if (crossTabBound || typeof window === "undefined") return;
  crossTabBound = true;
  window.addEventListener("storage", (event) => {
    if (!event.key?.startsWith(STORAGE_PREFIX)) return;
    const key = event.key.slice(STORAGE_PREFIX.length);
    cache.delete(key);
    listeners.get(key)?.forEach((l) => l());
  });
}

export function readKey<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  let value: T = fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw != null) value = JSON.parse(raw) as T;
  } catch {
    value = fallback;
  }
  cache.set(key, value);
  return value;
}

export function writeKey<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    throw new StorageWriteError(
      error instanceof Error ? error.message : "localStorage write failed",
    );
  }
  cache.set(key, value);
  listeners.get(key)?.forEach((l) => l());
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_PREFIX + key);
  cache.delete(key);
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, listener: Listener) {
  bindCrossTab();
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => set.delete(listener);
}

/** Subscribe a component to a stored value. `fallback` must be a stable reference. */
export function useStoredValue<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    (l) => subscribe(key, l),
    () => readKey(key, fallback),
    () => fallback,
  );
}

/** Rough size of all app data in bytes (UTF-16 ≈ 2 bytes/char). */
export function estimateUsageBytes(): number {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) {
      total += (k.length + (window.localStorage.getItem(k)?.length ?? 0)) * 2;
    }
  }
  return total;
}

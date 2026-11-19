import { normalizeProject } from "@/lib/domain/production";

import { readKey, removeKey, useStoredValue, writeKey } from "./local-store";
import type {
  AnimationSpec,
  Character,
  ChatMessage,
  EditingRequest,
  Project,
  Script,
  ThumbnailBrief,
} from "./types";

export interface Collection<T extends { id: string }> {
  key: string;
  useAll: () => T[];
  getAll: () => T[];
  get: (id: string) => T | undefined;
  upsert: (item: T) => void;
  remove: (id: string) => void;
  replaceAll: (items: T[]) => void;
  clear: () => void;
}

function createCollection<T extends { id: string }>(
  key: string,
  normalize?: (item: T) => T,
): Collection<T> {
  const EMPTY: T[] = [];
  // Memoised per stored array so subscribers keep a stable reference.
  const memo = new WeakMap<T[], T[]>();
  const norm = (list: T[]): T[] => {
    if (!normalize || !Array.isArray(list)) return list;
    let out = memo.get(list);
    if (!out) {
      out = list.map(normalize);
      memo.set(list, out);
    }
    return out;
  };
  const getAll = () => norm(readKey<T[]>(key, EMPTY));
  return {
    key,
    useAll: () => norm(useStoredValue<T[]>(key, EMPTY)),
    getAll,
    get: (id) => getAll().find((i) => i.id === id),
    upsert: (item) => {
      const list = getAll();
      const idx = list.findIndex((i) => i.id === item.id);
      const next = idx === -1 ? [item, ...list] : list.map((i) => (i.id === item.id ? item : i));
      writeKey(key, next);
    },
    remove: (id) => writeKey(key, getAll().filter((i) => i.id !== id)),
    replaceAll: (items) => writeKey(key, items),
    clear: () => removeKey(key),
  };
}

export const projects = createCollection<Project>("projects", normalizeProject);
export const scripts = createCollection<Script>("scripts");
export const characters = createCollection<Character>("characters");
export const animations = createCollection<AnimationSpec>("animations");
export const edits = createCollection<EditingRequest>("edits");
export const thumbnails = createCollection<ThumbnailBrief>("thumbnails");
export const chat = createCollection<ChatMessage>("chat");

export const ALL_COLLECTIONS = {
  projects,
  scripts,
  characters,
  animations,
  edits,
  thumbnails,
  chat,
} as const;

export type CollectionName = keyof typeof ALL_COLLECTIONS;

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

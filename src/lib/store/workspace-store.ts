import { useHydrated } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  cleanPrefs,
  DEFAULT_PREFS,
  detectDeviceMode,
  isModeSetting,
  resolveMode,
  STARTER_PROFILES,
  type EditorPrefs,
  type EditorProfile,
  type EditorResult,
  type WorkspaceMode,
  type WorkspaceModeSetting,
} from "@/lib/domain/workspace";

import { readKey, useStoredValue, writeKey } from "./local-store";

/** Separate keys: never touch projects/scripts/etc. when mode or editors change. */
export const MODE_KEY = "workspace-mode";
export const SIDEBAR_KEY = "workspace-sidebar-collapsed";
export const PROFILES_KEY = "editor-profiles";
export const PREFS_KEY = "editor-prefs";
export const RESULTS_KEY = "editor-results";

const NO_RESULTS: EditorResult[] = [];

export function getModeSetting(): WorkspaceModeSetting {
  const v = readKey<unknown>(MODE_KEY, "auto");
  return isModeSetting(v) ? v : "auto";
}
export function setModeSetting(v: WorkspaceModeSetting) {
  writeKey(MODE_KEY, v);
}
export const getSidebarCollapsed = () => readKey<boolean>(SIDEBAR_KEY, false) === true;
export const setSidebarCollapsed = (v: boolean) => writeKey(SIDEBAR_KEY, v);
export const useSidebarCollapsed = () => useStoredValue<boolean>(SIDEBAR_KEY, false) === true;

function detectNow(): WorkspaceMode {
  return detectDeviceMode({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    width: window.innerWidth,
  });
}

/** `mode` is null until hydrated, so SSR keeps the plain responsive layout. */
export function useWorkspaceMode() {
  const hydrated = useHydrated();
  const raw = useStoredValue<unknown>(MODE_KEY, "auto");
  const setting: WorkspaceModeSetting = isModeSetting(raw) ? raw : "auto";
  const [detected, setDetected] = useState<WorkspaceMode | null>(null);
  useEffect(() => {
    const update = () => setDetected(detectNow());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const mode = hydrated && detected ? resolveMode(setting, detected) : null;
  return { setting, mode, detected, setSetting: setModeSetting };
}

export function getProfiles(): EditorProfile[] {
  const v = readKey<EditorProfile[]>(PROFILES_KEY, STARTER_PROFILES);
  return Array.isArray(v) ? v : STARTER_PROFILES;
}
export const useProfiles = () => useStoredValue<EditorProfile[]>(PROFILES_KEY, STARTER_PROFILES);

export function getPrefs(): EditorPrefs {
  return readKey<EditorPrefs>(PREFS_KEY, DEFAULT_PREFS);
}
export const usePrefs = () => useStoredValue<EditorPrefs>(PREFS_KEY, DEFAULT_PREFS);
export function savePrefs(p: EditorPrefs) {
  writeKey(PREFS_KEY, p);
}

export function upsertProfile(p: EditorProfile) {
  const list = getProfiles();
  const next = list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p];
  writeKey(PROFILES_KEY, next);
  savePrefs(cleanPrefs(getPrefs(), next));
}
export function removeProfile(id: string) {
  const next = getProfiles().filter((x) => x.id !== id);
  writeKey(PROFILES_KEY, next);
  savePrefs(cleanPrefs(getPrefs(), next));
}
/** Re-add any missing starter profiles without touching user ones. */
export function restoreStarters() {
  const list = getProfiles();
  const missing = STARTER_PROFILES.filter((s) => !list.some((x) => x.id === s.id));
  writeKey(PROFILES_KEY, [...list, ...missing]);
}

export const getResults = () => readKey<EditorResult[]>(RESULTS_KEY, NO_RESULTS);
export const useResults = () => useStoredValue<EditorResult[]>(RESULTS_KEY, NO_RESULTS);
export const addResult = (r: EditorResult) => writeKey(RESULTS_KEY, [r, ...getResults()]);
export const removeResult = (id: string) => writeKey(RESULTS_KEY, getResults().filter((r) => r.id !== id));

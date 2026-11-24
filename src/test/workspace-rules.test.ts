import { beforeEach, describe, expect, it } from "vitest";
import { parseFormats, resolveMode, setPreferred, STARTER_PROFILES, validateProfileInput, validateResultFile } from "@/lib/domain/workspace";
import { getModeSetting, getPrefs, getProfiles, removeProfile, setModeSetting, upsertProfile } from "@/lib/store/workspace-store";

const base = { name: "Kdenlive", platform: "desktop", websiteUrl: "https://kdenlive.org/", launchUrl: "", importFormats: "mp4, .mov", exportFormats: "MP4", notes: "" };
beforeEach(() => localStorage.clear());

describe("workspace", () => {
  it("manual mode overrides detection; auto follows device", () => {
    expect(resolveMode("computer", "mobile")).toBe("computer");
    expect(resolveMode("auto", "mobile")).toBe("mobile");
  });
  it("persists mode setting", () => { setModeSetting("computer"); expect(getModeSetting()).toBe("computer"); });
  it("per-mode prefs reject wrong platform", () => {
    expect(setPreferred(getPrefs(), STARTER_PROFILES, "mobile", "starter-shotcut").ok).toBe(false);
    const r = setPreferred(getPrefs(), STARTER_PROFILES, "computer", "starter-shotcut");
    expect(r.ok && r.prefs).toEqual({ mobile: "starter-capcut", computer: "starter-shotcut" });
  });
  it("validates profiles", () => {
    expect(validateProfileInput({ ...base, websiteUrl: "javascript:alert(1)" }, [], null).ok).toBe(false);
    expect(validateProfileInput({ ...base, launchUrl: "data:x" }, [], null).ok).toBe(false);
    expect(validateProfileInput({ ...base, name: "capcut" }, STARTER_PROFILES, null).ok).toBe(false);
    expect(parseFormats("mp4, .mov")).toEqual({ ok: true, formats: ["MP4", "MOV"] });
  });
  it("add/remove profile clears its preference", () => {
    removeProfile("starter-capcut");
    expect(getPrefs().mobile).toBeNull();
    expect(getProfiles().length).toBe(3);
    upsertProfile({ ...STARTER_PROFILES[0]!, id: "x", name: "X" });
    expect(getProfiles().some((p) => p.id === "x")).toBe(true);
  });
  it("validates imported result file", () => {
    expect(validateResultFile({ name: "a.exe", type: "application/x-msdownload", size: 5 })).not.toBeNull();
    expect(validateResultFile({ name: "a.mp4", type: "video/mp4", size: 5 })).toBeNull();
    expect(validateResultFile({ name: "a.mp4", type: "video/mp4", size: 3 * 1024 ** 3 })).not.toBeNull();
  });
});

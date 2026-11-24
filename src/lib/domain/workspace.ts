/** Pure rules for workspace modes, editor-app profiles and editor handoff. No I/O. */
import type { EditingRequest, Project, Script, ThumbnailBrief } from "@/lib/store/types";

export type WorkspaceModeSetting = "auto" | "mobile" | "computer";
export type WorkspaceMode = "mobile" | "computer";
export type EditorPlatform = "mobile" | "desktop" | "both";

export const MODE_LABELS: Record<WorkspaceModeSetting, string> = {
  auto: "স্বয়ংক্রিয়",
  mobile: "মোবাইল মোড",
  computer: "কম্পিউটার মোড",
};
export const PLATFORM_FIT_LABELS: Record<EditorPlatform, string> = {
  mobile: "মোবাইল",
  desktop: "ডেস্কটপ",
  both: "দুটোই",
};

export function isModeSetting(v: unknown): v is WorkspaceModeSetting {
  return v === "auto" || v === "mobile" || v === "computer";
}

/** Device detection is only a suggestion used by "auto". */
export function detectDeviceMode(env: { coarsePointer: boolean; width: number }): WorkspaceMode {
  return env.coarsePointer && env.width < 1024 ? "mobile" : env.width < 768 ? "mobile" : "computer";
}

export function resolveMode(setting: unknown, detected: WorkspaceMode): WorkspaceMode {
  if (setting === "mobile" || setting === "computer") return setting;
  return detected;
}

export interface EditorProfile {
  id: string;
  name: string;
  platform: EditorPlatform;
  websiteUrl: string;
  launchUrl: string;
  importFormats: string[];
  exportFormats: string[];
  notes: string;
  enabled: boolean;
  isStarter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EditorPrefs {
  mobile: string | null;
  computer: string | null;
}

const STARTER_AT = "2026-01-01T00:00:00.000Z";
function starter(p: Pick<EditorProfile, "id" | "name" | "platform" | "websiteUrl" | "importFormats" | "exportFormats" | "notes">): EditorProfile {
  return { ...p, launchUrl: "", enabled: true, isStarter: true, createdAt: STARTER_AT, updatedAt: STARTER_AT };
}

export const STARTER_PROFILES: EditorProfile[] = [
  starter({
    id: "starter-capcut",
    name: "CapCut",
    platform: "mobile",
    websiteUrl: "https://www.capcut.com/",
    importFormats: ["MP4", "MOV", "SRT", "PNG", "JPG"],
    exportFormats: ["MP4"],
    notes: "বাহ্যিক এডিটর — সরাসরি সংযুক্ত নয়। ফাইল ডাউনলোড করে CapCut অ্যাপে নিজে খুলুন।",
  }),
  starter({
    id: "starter-davinci",
    name: "DaVinci Resolve",
    platform: "desktop",
    websiteUrl: "https://www.blackmagicdesign.com/products/davinciresolve",
    importFormats: ["MP4", "MOV", "SRT", "PNG", "WAV"],
    exportFormats: ["MP4", "MOV"],
    notes: "বাহ্যিক এডিটর — সরাসরি সংযুক্ত নয়। এই ওয়েবসাইট কম্পিউটারের সফটওয়্যার চালাতে পারে না।",
  }),
  starter({
    id: "starter-premiere",
    name: "Adobe Premiere Pro",
    platform: "desktop",
    websiteUrl: "https://www.adobe.com/products/premiere.html",
    importFormats: ["MP4", "MOV", "SRT", "PNG", "WAV"],
    exportFormats: ["MP4", "MOV"],
    notes: "বাহ্যিক এডিটর — সরাসরি সংযুক্ত নয়। পেইড সফটওয়্যার; এই অ্যাপ কোনো সাবস্ক্রিপশন কেনে না।",
  }),
  starter({
    id: "starter-shotcut",
    name: "Shotcut",
    platform: "desktop",
    websiteUrl: "https://shotcut.org/",
    importFormats: ["MP4", "MOV", "WEBM", "SRT", "PNG"],
    exportFormats: ["MP4", "WEBM"],
    notes: "বাহ্যিক এডিটর — সরাসরি সংযুক্ত নয়। ফ্রি ও ওপেন-সোর্স।",
  }),
];

export const DEFAULT_PREFS: EditorPrefs = { mobile: "starter-capcut", computer: null };

export function fitsMode(platform: EditorPlatform, mode: WorkspaceMode): boolean {
  return platform === "both" || (mode === "mobile" ? platform === "mobile" : platform === "desktop");
}

/** Only http(s) website links. */
export function isValidWebUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname;
  } catch {
    return false;
  }
}

const BLOCKED_SCHEMES = new Set(["javascript:", "data:", "file:", "vbscript:", "blob:", "about:"]);
/** Launch links may be http(s) or an app's own scheme (e.g. myeditor://), never script/data/file. */
export function isValidLaunchUrl(raw: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) return false;
  try {
    const u = new URL(raw);
    if (BLOCKED_SCHEMES.has(u.protocol.toLowerCase())) return false;
    if (u.protocol === "http:" || u.protocol === "https:") return !!u.hostname;
    return raw.length > u.protocol.length + 1;
  } catch {
    return false;
  }
}

export type FormatsResult = { ok: true; formats: string[] } | { ok: false; error: string };
export function parseFormats(raw: string): FormatsResult {
  const parts = raw.split(/[,\s،]+/).map((s) => s.trim().replace(/^\./, "").toUpperCase()).filter(Boolean);
  const unique = [...new Set(parts)];
  const bad = unique.find((f) => !/^[A-Z0-9]{2,6}$/.test(f));
  if (bad) return { ok: false, error: `“${bad}” বৈধ ফরম্যাট নয় (যেমন MP4, MOV, SRT)।` };
  if (unique.length > 20) return { ok: false, error: "সর্বোচ্চ ২০টি ফরম্যাট দেওয়া যাবে।" };
  return { ok: true, formats: unique };
}

export interface ProfileInput {
  name: string;
  platform: string;
  websiteUrl: string;
  launchUrl: string;
  importFormats: string;
  exportFormats: string;
  notes: string;
}
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;
export type ProfileValidation =
  | { ok: true; value: Pick<EditorProfile, "name" | "platform" | "websiteUrl" | "launchUrl" | "importFormats" | "exportFormats" | "notes"> }
  | { ok: false; errors: ProfileErrors };

export function validateProfileInput(input: ProfileInput, existing: EditorProfile[], selfId: string | null): ProfileValidation {
  const errors: ProfileErrors = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = "অ্যাপের নাম কমপক্ষে ২ অক্ষরের হতে হবে।";
  else if (name.length > 60) errors.name = "নাম ৬০ অক্ষরের বেশি হতে পারবে না।";
  else if (existing.some((p) => p.id !== selfId && p.name.trim().toLowerCase() === name.toLowerCase()))
    errors.name = "এই নামে আরেকটি প্রোফাইল আছে।";
  if (input.platform !== "mobile" && input.platform !== "desktop" && input.platform !== "both")
    errors.platform = "প্ল্যাটফর্ম বেছে নিন।";
  const websiteUrl = input.websiteUrl.trim();
  if (websiteUrl && !isValidWebUrl(websiteUrl)) errors.websiteUrl = "https:// দিয়ে শুরু হওয়া বৈধ ওয়েব ঠিকানা দিন।";
  const launchUrl = input.launchUrl.trim();
  if (launchUrl && !isValidLaunchUrl(launchUrl)) errors.launchUrl = "বৈধ লঞ্চ লিংক দিন (যেমন https://… বা app://…)।";
  const imp = parseFormats(input.importFormats);
  if (!imp.ok) errors.importFormats = imp.error;
  const exp = parseFormats(input.exportFormats);
  if (!exp.ok) errors.exportFormats = exp.error;
  if (input.notes.length > 500) errors.notes = "নোট ৫০০ অক্ষরের মধ্যে রাখুন।";
  if (Object.keys(errors).length || !imp.ok || !exp.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      platform: input.platform as EditorPlatform,
      websiteUrl,
      launchUrl,
      importFormats: imp.formats,
      exportFormats: exp.formats,
      notes: input.notes.trim(),
    },
  };
}

export type PrefResult = { ok: true; prefs: EditorPrefs } | { ok: false; error: string };
export function setPreferred(prefs: EditorPrefs, profiles: EditorProfile[], mode: WorkspaceMode, id: string | null): PrefResult {
  if (id === null) return { ok: true, prefs: { ...prefs, [mode]: null } };
  const p = profiles.find((x) => x.id === id);
  if (!p) return { ok: false, error: "প্রোফাইলটি পাওয়া যায়নি।" };
  if (!p.enabled) return { ok: false, error: "বন্ধ করা প্রোফাইল পছন্দের এডিটর হতে পারে না।" };
  if (!fitsMode(p.platform, mode))
    return { ok: false, error: `${p.name} এই মোডের প্ল্যাটফর্মের সাথে মেলে না।` };
  return { ok: true, prefs: { ...prefs, [mode]: id } };
}

/** Drop preferences pointing at removed, disabled or no-longer-fitting profiles. */
export function cleanPrefs(prefs: EditorPrefs, profiles: EditorProfile[]): EditorPrefs {
  const ok = (mode: WorkspaceMode) => {
    const id = prefs[mode];
    const p = id ? profiles.find((x) => x.id === id) : undefined;
    return p && p.enabled && fitsMode(p.platform, mode) ? p.id : null;
  };
  return { mobile: ok("mobile"), computer: ok("computer") };
}

/* ---------- Handoff export ---------- */

function srtTime(totalSec: number): string {
  const ms = Math.round(totalSec * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const r = ms % 1000;
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
}

/** Standard SubRip subtitles from scene narration; importable by most editors. */
export function buildSrt(scenes: Script["scenes"]): string {
  let t = 0;
  const blocks: string[] = [];
  for (const sc of scenes) {
    const dur = Math.max(1, Number(sc.durationSec) || 0);
    const text = sc.narration.trim();
    if (text) blocks.push(`${blocks.length + 1}\n${srtTime(t)} --> ${srtTime(t + dur)}\n${text}\n`);
    t += dur;
  }
  return blocks.join("\n");
}

export interface HandoffInput {
  project: Project;
  scripts: Script[];
  edits: EditingRequest[];
  thumbnails: ThumbnailBrief[];
  editor: EditorProfile | null;
  mode: WorkspaceMode;
  at: string;
}

export const HANDOFF_FORMAT = "master-ai-studio-handoff";

export function buildHandoffBundle(i: HandoffInput) {
  const pid = i.project.id;
  return {
    format: HANDOFF_FORMAT,
    version: 1,
    exportedAt: i.at,
    mode: i.mode,
    editor: i.editor ? { name: i.editor.name, platform: i.editor.platform, directIntegration: false } : null,
    project: i.project,
    scripts: i.scripts.filter((s) => s.projectId === pid),
    edits: i.edits.filter((e) => e.projectId === pid),
    thumbnails: i.thumbnails.filter((t) => t.projectId === pid),
  };
}

export function buildBriefText(i: HandoffInput): string {
  const b = buildHandoffBundle(i);
  const lines: string[] = [
    `Master AI Studio — এডিটিং হ্যান্ডঅফ`,
    `প্রজেক্ট: ${b.project.title}`,
    `এডিটর: ${b.editor?.name ?? "বাছাই করা হয়নি"} (বাহ্যিক, সরাসরি সংযুক্ত নয়)`,
    `তারিখ: ${b.exportedAt}`,
    "",
  ];
  if (b.project.description) lines.push(`বিবরণ: ${b.project.description}`, "");
  for (const s of b.scripts) {
    lines.push(`## স্ক্রিপ্ট: ${s.title || "শিরোনামহীন"}`);
    s.scenes.forEach((sc, n) => lines.push(`দৃশ্য ${n + 1} (${sc.durationSec} সেকেন্ড)`, `  দৃশ্য: ${sc.visual}`, `  বর্ণনা: ${sc.narration}`));
    lines.push("");
  }
  for (const e of b.edits) {
    lines.push(`## এডিটিং নির্দেশনা: ${e.title}`);
    if (e.autoOptions.length) lines.push(`  অপশন: ${e.autoOptions.join(", ")}`);
    if (e.instruction) lines.push(`  নির্দেশ: ${e.instruction}`);
    if (e.videoName) lines.push(`  ভিডিও: ${e.videoName} (এই ডিভাইসে আলাদাভাবে রাখুন)`);
    lines.push("");
  }
  for (const t of b.thumbnails) lines.push(`## থাম্বনেইল: ${t.text} · ${t.aspectRatio} · ${t.style}`);
  return lines.join("\n");
}

/* ---------- Edited-result import ---------- */

export const RESULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const RESULT_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"]);
const RESULT_EXT = new Set(["mp4", "mov", "webm", "mkv", "m4v"]);

export function validateResultFile(f: { name: string; type: string; size: number }): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!RESULT_EXT.has(ext) || (f.type && !RESULT_TYPES.has(f.type) && !f.type.startsWith("video/")))
    return "শুধু MP4, MOV, WEBM বা MKV ভিডিও ফাইল দেওয়া যাবে।";
  if (f.size <= 0) return "ফাইলটি খালি।";
  if (f.size > RESULT_MAX_BYTES) return "ফাইলটি ২ GB-এর বেশি বড়।";
  return null;
}

export interface EditorResult {
  id: string;
  projectId: string | null;
  editorName: string | null;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  durationSec: number | null;
  note: string;
  importedAt: string;
}

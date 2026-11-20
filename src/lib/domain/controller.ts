/**
 * Master Controller — rule-based planning and routing.
 *
 * No AI is involved: the brief the user writes is stored on a regular Project,
 * an optional empty Script draft is linked to it, and the stage plan below is
 * derived deterministically from saved data. Nothing is generated or rendered.
 */
import type { ProviderSlotId } from "@/lib/ai/provider-slots";
import type { Platform, Project, Script, StageKey } from "@/lib/store/types";

import { toBnDigits } from "./labels";
import { createInitialStages, INITIAL_APPROVAL, STAGE_ORDER } from "./production";

export const CONTROLLER_DURATIONS = [15, 30, 45, 60, 90, 120, 180];
export const VIDEO_TYPE_SUGGESTIONS = [
  "কার্টুন গল্প",
  "শিক্ষামূলক",
  "মজার / কমেডি",
  "রহস্য / ভৌতিক",
  "অনুপ্রেরণামূলক",
  "শিশুতোষ",
];

export const LIMITS = { title: 80, instruction: 2000, extra: 1000, minDuration: 5, maxDuration: 600 };

export interface BriefInput {
  title: string;
  instruction: string;
  platform: Platform;
  videoType: string;
  targetDurationSec: number;
  extraInstructions: string;
  createScriptDraft: boolean;
}

export const DEFAULT_BRIEF_INPUT: BriefInput = {
  title: "",
  instruction: "",
  platform: "facebook_reels",
  videoType: "",
  targetDurationSec: 30,
  extraInstructions: "",
  createScriptDraft: true,
};

export type BriefField = "title" | "instruction" | "videoType" | "targetDurationSec" | "extraInstructions";
export type BriefErrors = Partial<Record<BriefField, string>>;

export function validateBrief(input: BriefInput): BriefErrors {
  const e: BriefErrors = {};
  const title = input.title.trim();
  const instruction = input.instruction.trim();
  if (instruction.length < 10) e.instruction = "ভিডিওর আইডিয়া বা নির্দেশ কমপক্ষে ১০ অক্ষরে লিখুন।";
  else if (instruction.length > LIMITS.instruction) e.instruction = "নির্দেশ ২০০০ অক্ষরের মধ্যে রাখুন।";
  if (title.length > LIMITS.title) e.title = "নাম ৮০ অক্ষরের মধ্যে রাখুন।";
  else if (title.length > 0 && title.length < 2) e.title = "নাম কমপক্ষে ২ অক্ষরের দিন, অথবা খালি রাখুন।";
  if (input.videoType.trim().length < 2) e.videoType = "ভিডিওর ধরন লিখুন বা নিচ থেকে একটি বাছুন।";
  const d = input.targetDurationSec;
  if (!Number.isInteger(d) || d < LIMITS.minDuration || d > LIMITS.maxDuration)
    e.targetDurationSec = "দৈর্ঘ্য ৫ থেকে ৬০০ সেকেন্ডের মধ্যে দিন।";
  if (input.extraInstructions.trim().length > LIMITS.extra) e.extraInstructions = "অতিরিক্ত নির্দেশ ১০০০ অক্ষরের মধ্যে রাখুন।";
  return e;
}

/** Project name from the first line of the instruction when the user leaves it blank. */
export function deriveTitle(instruction: string): string {
  const first = instruction.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first;
}

export function createFromBrief(
  input: BriefInput,
  at: string,
  ids: { projectId: string; scriptId: string },
): { project: Project; script: Script | null } {
  const instruction = input.instruction.trim();
  const title = input.title.trim() || deriveTitle(instruction);
  const stages = createInitialStages(at);
  const script: Script | null = input.createScriptDraft
    ? {
        id: ids.scriptId,
        projectId: ids.projectId,
        title,
        idea: instruction,
        platform: input.platform,
        targetDurationSec: input.targetDurationSec,
        language: "bn",
        style: input.videoType.trim(),
        characterIds: [],
        scenes: [],
        isExample: false,
        createdAt: at,
        updatedAt: at,
      }
    : null;
  if (script) {
    stages.script = { status: "draft", note: "কন্ট্রোলার একটি খালি স্ক্রিপ্ট খসড়া খুলেছে — দৃশ্য লেখা বাকি।", updatedAt: at };
  }
  const project: Project = {
    id: ids.projectId,
    title,
    description: instruction,
    platform: input.platform,
    isExample: false,
    createdAt: at,
    updatedAt: at,
    stages,
    approval: INITIAL_APPROVAL,
    brief: {
      instruction,
      videoType: input.videoType.trim(),
      targetDurationSec: input.targetDurationSec,
      extraInstructions: input.extraInstructions.trim(),
      createdAt: at,
    },
  };
  return { project, script };
}

export type StageLinkTarget = "/script" | "/characters" | "/animation" | "/editing" | "/thumbnail" | "/monitor";

export interface StagePlanItem {
  stage: StageKey;
  purpose: string;
  inputs: string[];
  nextAction: string;
  link: { to: StageLinkTarget; label: string; scriptId?: string };
  /** Provider needed before this step could ever be automated; null = manual by design. */
  providerSlot: ProviderSlotId | null;
}

export interface PlanContext {
  scripts: Script[];
  characterNames: string[];
  animationCount: number;
  editCount: number;
  thumbnailCount: number;
}

function statusAction(project: Project, stage: StageKey): string | null {
  switch (project.stages[stage]?.status) {
    case "done":
      return "আপনি সম্পন্ন চিহ্নিত করেছেন — পরের ধাপে যান।";
    case "failed":
      return "সমস্যাটি ঠিক করে স্ট্যাটাস আবার হালনাগাদ করুন।";
    case "ready_review":
      return "নিজে দেখে নিন, ঠিক থাকলে ‘সম্পন্ন’ চিহ্নিত করুন।";
    default:
      return null;
  }
}

export function buildStagePlan(project: Project, ctx: PlanContext): StagePlanItem[] {
  const brief = project.brief;
  const duration = `${toBnDigits(brief?.targetDurationSec ?? 0)} সেকেন্ড`;
  const firstScript = ctx.scripts[0];
  const sceneCount = ctx.scripts.reduce((n, s) => n + s.scenes.length, 0);
  const chars = ctx.characterNames;

  const items: Record<StageKey, Omit<StagePlanItem, "stage">> = {
    script: {
      purpose: "আইডিয়াকে দৃশ্যভিত্তিক স্ক্রিপ্টে ভাগ করা — প্রতিটি দৃশ্যের ছবি, সংলাপ ও সময়।",
      inputs: [
        "আপনার নির্দেশ ও অতিরিক্ত নির্দেশ",
        `ধরন: ${brief?.videoType || "—"}`,
        `দৈর্ঘ্য: ${duration}`,
      ],
      nextAction:
        ctx.scripts.length === 0
          ? "স্ক্রিপ্ট এজেন্টে এই প্রজেক্টের সাথে যুক্ত একটি স্ক্রিপ্ট লিখুন।"
          : sceneCount === 0
            ? "খসড়াটি খুলে দৃশ্যগুলো নিজে লিখে সংরক্ষণ করুন।"
            : `${toBnDigits(sceneCount)}টি দৃশ্য লেখা আছে — রিভিউ করে স্ট্যাটাস হালনাগাদ করুন।`,
      link: firstScript
        ? { to: "/script", label: "স্ক্রিপ্ট খসড়া খুলুন", scriptId: firstScript.id }
        : { to: "/script", label: "স্ক্রিপ্ট এজেন্টে যান" },
      providerSlot: "text",
    },
    character: {
      purpose: "চরিত্রের চেহারা, পোশাক ও ধারাবাহিকতা ঠিক করা, যাতে প্রতিটি দৃশ্যে একই থাকে।",
      inputs: [
        "স্ক্রিপ্টে থাকা চরিত্র",
        chars.length ? `যুক্ত চরিত্র: ${chars.join(", ")}` : "স্ক্রিপ্টে এখনও কোনো চরিত্র যুক্ত নেই",
      ],
      nextAction: chars.length
        ? "চরিত্রের বর্ণনা মিলিয়ে দেখুন, ঠিক থাকলে স্ট্যাটাস হালনাগাদ করুন।"
        : "ক্যারেক্টার ক্রিয়েটরে চরিত্র বানান, তারপর স্ক্রিপ্টে যুক্ত করুন।",
      link: { to: "/characters", label: "ক্যারেক্টার ক্রিয়েটরে যান" },
      providerSlot: null,
    },
    animation: {
      purpose: "দৃশ্যগুলোর অ্যানিমেশন স্পেক বা প্রম্পট তৈরি। ইঞ্জিন (Code Animation বা Google Flow) আপনি নিজে বাছবেন।",
      inputs: ["স্ক্রিপ্টের দৃশ্য", "চরিত্রের বর্ণনা", `ধরন: ${brief?.videoType || "—"}`],
      nextAction:
        ctx.animationCount === 0
          ? "অ্যানিমেশন ইঞ্জিনে এই প্রজেক্ট বেছে একটি স্পেক সংরক্ষণ করুন।"
          : `${toBnDigits(ctx.animationCount)}টি স্পেক আছে — Flow-এ বা বাইরে রেন্ডার শেষ হলে স্ট্যাটাস হালনাগাদ করুন।`,
      link: { to: "/animation", label: "অ্যানিমেশন ইঞ্জিনে যান" },
      providerSlot: "video",
    },
    voice: {
      purpose: "সংলাপ ও ভয়েসওভারের কণ্ঠ ঠিক করা ও রেকর্ড করা।",
      inputs: ["স্ক্রিপ্টের সংলাপ", "চরিত্রের কণ্ঠের নোট"],
      nextAction:
        "চরিত্রের কণ্ঠের নোট লিখুন, তারপর ভয়েস নিজে রেকর্ড করুন বা বাইরের টুল ব্যবহার করুন। শেষ হলে স্ট্যাটাস হালনাগাদ করুন।",
      link: { to: "/characters", label: "কণ্ঠের নোট লিখুন" },
      providerSlot: "voice",
    },
    editing: {
      purpose: "কাট, ক্যাপশন, মিউজিক ও গতি সাজিয়ে চূড়ান্ত ভিডিও তৈরি।",
      inputs: ["রেন্ডার হওয়া দৃশ্য", "ভয়েস", `প্ল্যাটফর্মের দৈর্ঘ্য: ${duration}`],
      nextAction:
        ctx.editCount === 0
          ? "এডিটিং এজেন্টে এই প্রজেক্টের জন্য একটি এডিটিং অনুরোধ সংরক্ষণ করুন।"
          : `${toBnDigits(ctx.editCount)}টি এডিটিং অনুরোধ আছে — এডিট শেষ হলে স্ট্যাটাস হালনাগাদ করুন।`,
      link: { to: "/editing", label: "এডিটিং এজেন্টে যান" },
      providerSlot: "editing",
    },
    thumbnail: {
      purpose: "ভিডিওর জন্য নজরকাড়া থাম্বনেইলের ব্রিফ ও প্রম্পট।",
      inputs: ["প্রজেক্টের নাম ও মূল ভাবনা", "চরিত্র", "প্ল্যাটফর্মের মাপ (৯:১৬ বা ১৬:৯)"],
      nextAction:
        ctx.thumbnailCount === 0
          ? "থাম্বনেইল স্টুডিওতে এই প্রজেক্ট বেছে একটি ব্রিফ সংরক্ষণ করুন।"
          : `${toBnDigits(ctx.thumbnailCount)}টি ব্রিফ আছে — ছবি তৈরি হলে স্ট্যাটাস হালনাগাদ করুন।`,
      link: { to: "/thumbnail", label: "থাম্বনেইল স্টুডিওতে যান" },
      providerSlot: "image",
    },
    review: {
      purpose: "সব ধাপ নিজে দেখে চূড়ান্ত অনুমোদন। অনুমোদন মানে প্রকাশ নয়।",
      inputs: ["সব ধাপের স্ট্যাটাস ও নোট"],
      nextAction: "সব প্রোডাকশন ধাপ ‘সম্পন্ন’ হলে নিচে নিশ্চিত করে অনুমোদন দিন।",
      link: { to: "/monitor", label: "প্রোডাকশন মনিটরে খুলুন" },
      providerSlot: null,
    },
  };

  return STAGE_ORDER.map((stage) => {
    const item = items[stage];
    const override = stage === "review" ? null : statusAction(project, stage);
    return { stage, ...item, nextAction: override ?? item.nextAction };
  });
}

const BN_TO_LATIN: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };

/** Accepts Bengali or Latin digits (Android Bengali keyboards type ০-৯). Returns NaN for anything else. */
export function parseDurationInput(raw: string): number {
  const latin = raw.trim().replace(/[০-৯]/g, (d) => BN_TO_LATIN[d] ?? d);
  return /^\d{1,4}$/.test(latin) ? Number(latin) : Number.NaN;
}

import type { AnimationSpec, AspectRatio, Character, Script } from "@/lib/store/types";
import { LANGUAGE_LABELS, PLATFORM_LABELS } from "./labels";

export interface ThumbnailPromptInput {
  text: string;
  aspectRatio: AspectRatio;
  style: string;
  mood: string;
  extraNotes: string;
  hasReference: boolean;
}

/** Plain-text image prompt for a thumbnail brief (usable in any image tool). */
export function buildThumbnailPrompt(input: ThumbnailPromptInput): string {
  const orientation = input.aspectRatio === "9:16" ? "vertical 9:16" : "horizontal 16:9";
  const lines = [
    `Create a ${orientation} social video thumbnail.`,
    input.style.trim() && `Visual style: ${input.style.trim()}.`,
    input.mood.trim() && `Mood / color feel: ${input.mood.trim()}.`,
    input.text.trim() &&
      `Bold, highly readable Bengali headline text exactly as written: "${input.text.trim()}". Use a clean Bengali font with strong contrast; keep text inside safe margins.`,
    input.hasReference && "Match the subject and look of the attached reference.",
    input.extraNotes.trim() && `Notes: ${input.extraNotes.trim()}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildCharacterReference(c: Character): string {
  return [
    `Character: ${c.name}`,
    c.visualDescription && `Appearance: ${c.visualDescription}`,
    c.clothing && `Clothing: ${c.clothing}`,
    c.voiceNotes && `Voice: ${c.voiceNotes}`,
    c.continuityNotes && `Keep consistent: ${c.continuityNotes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Prompt text to copy into Google Flow. Engine choice is never changed here. */
export function buildFlowPrompt(
  spec: Pick<AnimationSpec, "visualStyle" | "prompt">,
  linkedCharacters: Character[],
): string {
  return [
    spec.visualStyle.trim() && `Style: ${spec.visualStyle.trim()}`,
    spec.prompt.trim(),
    ...linkedCharacters.map(buildCharacterReference),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function totalSceneDuration(script: Pick<Script, "scenes">): number {
  return script.scenes.reduce((sum, s) => sum + (Number.isFinite(s.durationSec) ? s.durationSec : 0), 0);
}

export function scriptToText(script: Script, chars: Character[]): string {
  const linked = chars.filter((c) => script.characterIds.includes(c.id));
  const header = [
    `শিরোনাম: ${script.title}`,
    `প্ল্যাটফর্ম: ${PLATFORM_LABELS[script.platform]}`,
    `সময়: ${script.targetDurationSec} সেকেন্ড`,
    `ভাষা: ${LANGUAGE_LABELS[script.language]}`,
    `স্টাইল: ${script.style}`,
    linked.length ? `চরিত্র: ${linked.map((c) => c.name).join(", ")}` : null,
    "",
    "মূল আইডিয়া:",
    script.idea,
    "",
    "দৃশ্য বিভাজন:",
  ].filter((l) => l !== null);
  const scenes = script.scenes.map(
    (s, i) =>
      `\n[দৃশ্য ${i + 1}] (${s.durationSec} সেকেন্ড)\nদৃশ্য: ${s.visual}\nসংলাপ/বর্ণনা: ${s.narration}`,
  );
  return [...header, ...scenes].join("\n");
}

/** Parse "Scene 1 | 4s | description" style lines into a timeline for the code-animation preview. */
export interface TimelineBeat {
  index: number;
  label: string;
  durationSec: number | null;
}

export function parseCodeSpecTimeline(spec: string): TimelineBeat[] {
  return spec
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"))
    .map((line, index) => {
      const m = line.match(/(\d+(?:\.\d+)?)\s*(s|sec|সে|সেকেন্ড)\b/i);
      return {
        index,
        label: line.replace(/\|/g, " · "),
        durationSec: m ? Number(m[1]) : null,
      };
    });
}

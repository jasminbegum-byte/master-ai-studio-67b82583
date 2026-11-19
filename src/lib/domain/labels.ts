import type {
  AnimationEngine,
  AspectRatio,
  EditingMode,
  Platform,
  ScriptLanguage,
  StageKey,
  StageStatus,
} from "@/lib/store/types";

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook_reels: "Facebook Reels",
  youtube_shorts: "YouTube Shorts",
  instagram_reels: "Instagram Reels",
};

export const LANGUAGE_LABELS: Record<ScriptLanguage, string> = {
  bn: "বাংলা",
  en: "English",
  banglish: "বাংলা + English মিশ্র",
};

export const STAGE_LABELS: Record<StageKey, string> = {
  script: "স্ক্রিপ্ট",
  character: "চরিত্র",
  animation: "অ্যানিমেশন",
  editing: "এডিটিং",
  thumbnail: "থাম্বনেইল",
  review: "চূড়ান্ত রিভিউ",
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  not_started: "শুরু হয়নি",
  draft: "খসড়া",
  waiting_connection: "সংযোগের অপেক্ষায়",
  ready_review: "রিভিউয়ের জন্য প্রস্তুত",
  done: "সম্পন্ন",
  failed: "ব্যর্থ",
};

export const ENGINE_LABELS: Record<AnimationEngine, string> = {
  code_animation: "Code Animation",
  google_flow: "Google Flow",
};

export const EDITING_MODE_LABELS: Record<EditingMode, string> = {
  automatic: "অটোমেটিক মোড",
  prompt: "প্রম্পট মোড",
};

export const ASPECT_LABELS: Record<AspectRatio, string> = {
  "9:16": "৯:১৬ (Reels / Shorts)",
  "16:9": "১৬:৯ (ভিডিও / ওয়াইড)",
};

export const GOOGLE_FLOW_URL = "https://labs.google/fx/tools/flow";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBnDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatBnDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("bn-BD", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${toBnDigits(bytes)} B`;
  if (bytes < 1024 * 1024) return `${toBnDigits((bytes / 1024).toFixed(1))} KB`;
  return `${toBnDigits((bytes / (1024 * 1024)).toFixed(1))} MB`;
}

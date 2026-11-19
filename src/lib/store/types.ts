/** Shared data model for locally persisted studio records. */

export type StageKey =
  | "script"
  | "character"
  | "animation"
  | "voice"
  | "editing"
  | "thumbnail"
  | "review";

export type StageStatus =
  | "not_started"
  | "draft"
  | "waiting_connection"
  | "ready_review"
  | "done"
  | "failed";

export interface StageState {
  status: StageStatus;
  note: string;
  updatedAt: string;
}

export interface Approval {
  approved: boolean;
  approvedAt: string | null;
  note: string;
}

/** What the user asked the Master Controller for. Stored on the project it created. */
export interface ProductionBrief {
  instruction: string;
  videoType: string;
  targetDurationSec: number;
  extraInstructions: string;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  platform: Platform;
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
  stages: Record<StageKey, StageState>;
  approval: Approval;
  /** Present only on projects created from the Master Controller. */
  brief?: ProductionBrief;
}

export type Platform = "facebook_reels" | "youtube_shorts" | "instagram_reels";
export type ScriptLanguage = "bn" | "en" | "banglish";

export interface Scene {
  id: string;
  visual: string;
  narration: string;
  durationSec: number;
}

export interface Script {
  id: string;
  projectId: string | null;
  title: string;
  idea: string;
  platform: Platform;
  targetDurationSec: number;
  language: ScriptLanguage;
  style: string;
  characterIds: string[];
  scenes: Scene[];
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  visualDescription: string;
  clothing: string;
  voiceNotes: string;
  continuityNotes: string;
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AnimationEngine = "code_animation" | "google_flow";

export interface AnimationSpec {
  id: string;
  projectId: string | null;
  title: string;
  engine: AnimationEngine;
  visualStyle: string;
  characterIds: string[];
  prompt: string;
  codeSpec: string;
  createdAt: string;
  updatedAt: string;
}

export type EditingMode = "automatic" | "prompt";

export interface EditingRequest {
  id: string;
  projectId: string | null;
  title: string;
  mode: EditingMode;
  instruction: string;
  autoOptions: string[];
  videoName: string | null;
  videoSizeBytes: number | null;
  videoDurationSec: number | null;
  createdAt: string;
  updatedAt: string;
}

export type AspectRatio = "9:16" | "16:9";

export interface ThumbnailBrief {
  id: string;
  projectId: string | null;
  text: string;
  aspectRatio: AspectRatio;
  style: string;
  mood: string;
  extraNotes: string;
  referenceName: string | null;
  referenceKind: "image" | "video" | null;
  createdAt: string;
  updatedAt: string;
}

export type ChatStatus = "awaiting_provider" | "answered" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: ChatStatus;
  createdAt: string;
}

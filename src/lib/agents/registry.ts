/** Agent registry: browser-safe metadata and contracts. Execution lives on the server. */
export type AgentId = "controller" | "script" | "character" | "animation" | "voice" | "editing" | "thumbnail";
export type AgentJobStatus = "idle" | "queued" | "running" | "waiting_connection" | "completed" | "failed";

export interface AgentDef {
  id: AgentId;
  name: string;
  task: string;
  input: string;
  output: string;
  /** Existing page where the user works on this agent's output. */
  page: "/controller" | "/script" | "/characters" | "/animation" | "/editing" | "/thumbnail" | "/monitor";
}

export const AGENTS: AgentDef[] = [
  { id: "controller", name: "মাস্টার কন্ট্রোলার", task: "ব্রিফ নিয়ে প্রতিটি এজেন্টকে কাজ ভাগ করে দেয় (নিয়মভিত্তিক রাউটিং, AI নয়)।", input: "প্রজেক্ট ব্রিফ", output: "এজেন্ট-ভিত্তিক কাজের তালিকা", page: "/controller" },
  { id: "script", name: "স্ক্রিপ্ট এজেন্ট", task: "আইডিয়া থেকে দৃশ্য-ভিত্তিক বাংলা স্ক্রিপ্ট লেখে।", input: "আইডিয়া, প্ল্যাটফর্ম, দৈর্ঘ্য, ভাষা, স্টাইল", output: "শিরোনাম + দৃশ্য (ভিজ্যুয়াল, বর্ণনা, সেকেন্ড)", page: "/script" },
  { id: "character", name: "ক্যারেক্টার এজেন্ট", task: "চরিত্রের চেহারা, পোশাক ও ধারাবাহিকতা নোট তৈরি করবে।", input: "ব্রিফ/স্ক্রিপ্ট", output: "চরিত্র প্রোফাইল", page: "/characters" },
  { id: "animation", name: "অ্যানিমেশন এজেন্ট", task: "দৃশ্যের অ্যানিমেশন প্রম্পট/স্পেক তৈরি ও রেন্ডার করবে।", input: "স্ক্রিপ্ট + চরিত্র", output: "অ্যানিমেশন স্পেক / ভিডিও", page: "/animation" },
  { id: "voice", name: "ভয়েস এজেন্ট", task: "বর্ণনা থেকে ভয়েসওভার তৈরি করবে।", input: "স্ক্রিপ্টের বর্ণনা", output: "অডিও ফাইল", page: "/monitor" },
  { id: "editing", name: "এডিটিং এজেন্ট", task: "ভিডিও কাট, ক্যাপশন ও রেন্ডার করবে।", input: "ভিডিও + নির্দেশ", output: "এডিট করা ভিডিও", page: "/editing" },
  { id: "thumbnail", name: "থাম্বনেইল এজেন্ট", task: "থাম্বনেইল ছবি তৈরি করবে।", input: "থাম্বনেইল ব্রিফ", output: "ছবি", page: "/thumbnail" },
];

export const AGENT_IDS = AGENTS.map((a) => a.id);
export const getAgent = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

/** Agents the server can actually execute today. Others answer waiting_connection. */
export const EXECUTABLE_AGENTS: AgentId[] = ["controller", "script"];

export const AGENT_STATUS_LABELS: Record<AgentJobStatus, string> = {
  idle: "নিষ্ক্রিয়",
  queued: "লাইনে আছে",
  running: "চলছে",
  waiting_connection: "সংযোগের অপেক্ষায়",
  completed: "সম্পন্ন",
  failed: "ব্যর্থ",
};

export interface ScriptAgentInput {
  idea: string;
  platform: string;
  durationSec: number;
  language: string;
  style: string;
}
export interface ScriptAgentOutput {
  title: string;
  scenes: { visual: string; narration: string; durationSec: number }[];
}

export interface AgentJob {
  id: string;
  agentId: AgentId;
  projectId: string | null;
  parentJobId: string | null;
  instruction: string;
  scriptInput: ScriptAgentInput | null;
  status: AgentJobStatus;
  scriptOutput: ScriptAgentOutput | null;
  /** Controller output: ids of delegated child jobs. */
  childJobIds: string[];
  message: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/** A job left "running" (tab closed mid-call) is not running anymore. */
export const STALE_RUNNING_MS = 3 * 60_000;
export function normalizeJob(job: AgentJob, now = Date.now()): AgentJob {
  const base: AgentJob = { childJobIds: [], scriptInput: null, scriptOutput: null, model: null, message: "", parentJobId: null, startedAt: null, finishedAt: null, ...(job as Partial<AgentJob>) } as AgentJob;
  if (base.status === "running" && base.startedAt && now - Date.parse(base.startedAt) > STALE_RUNNING_MS) {
    return { ...base, status: "failed", message: "কাজটি মাঝপথে বন্ধ হয়েছে (পেজ বন্ধ বা সংযোগ বিচ্ছিন্ন)। আবার চালান।" };
  }
  return base;
}

/** Agents with at least one job truly in flight right now. */
export function activeAgentCount(jobs: AgentJob[]): number {
  return new Set(jobs.filter((j) => j.status === "running").map((j) => j.agentId)).size;
}

export function latestStatus(jobs: AgentJob[], agentId: AgentId): AgentJobStatus {
  const j = jobs.filter((x) => x.agentId === agentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return j?.status ?? "idle";
}

export function validateScriptInput(i: ScriptAgentInput): string | null {
  if (i.idea.trim().length < 10) return "আইডিয়া অন্তত ১০ অক্ষরের লিখুন।";
  if (i.idea.length > 4000) return "আইডিয়া ৪০০০ অক্ষরের মধ্যে রাখুন।";
  if (!Number.isFinite(i.durationSec) || i.durationSec < 5 || i.durationSec > 600) return "দৈর্ঘ্য ৫–৬০০ সেকেন্ডের মধ্যে দিন।";
  return null;
}

/** Validate a model's script output; never trust it blindly. */
export function parseScriptOutput(raw: unknown): ScriptAgentOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { title?: unknown; scenes?: unknown };
  if (typeof r.title !== "string" || !Array.isArray(r.scenes) || r.scenes.length === 0) return null;
  const scenes = r.scenes.flatMap((s) => {
    const x = s as { visual?: unknown; narration?: unknown; durationSec?: unknown };
    if (typeof x?.visual !== "string" || typeof x.narration !== "string") return [];
    const d = Number(x.durationSec);
    return [{ visual: x.visual.trim(), narration: x.narration.trim(), durationSec: Number.isFinite(d) && d > 0 ? Math.round(d) : 5 }];
  });
  return scenes.length ? { title: r.title.trim().slice(0, 120), scenes: scenes.slice(0, 30) } : null;
}

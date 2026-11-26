import { readKey, useStoredValue, writeKey } from "@/lib/store/local-store";
import { newId, nowIso } from "@/lib/store/collections";
import type { Project, Script } from "@/lib/store/types";

import type { RunAgentResult } from "./agents.functions";
import { NO_EXECUTOR_REASON, normalizeJob, parentStatusFromChildren, type AgentId, type AgentJob, type ScriptAgentInput } from "./registry";

const KEY = "agentJobs";
const EMPTY: AgentJob[] = [];
const memo = new WeakMap<AgentJob[], AgentJob[]>();
function deriveParents(list: AgentJob[]): AgentJob[] {
  return list.map((j) => {
    if (j.agentId !== "controller" || j.childJobIds.length === 0) return j;
    const kids = list.filter((c) => c.parentJobId === j.id);
    const status = parentStatusFromChildren(kids);
    const done = kids.filter((k) => k.status === "completed").length;
    return { ...j, status, message: `${kids.length}টি এজেন্ট: ${done}টি সম্পন্ন` + (status === "waiting_connection" ? "; বাকিগুলো সংযোগের অপেক্ষায়" : status === "running" ? "; কাজ চলছে" : status === "failed" ? "; কিছু ব্যর্থ" : "") };
  });
}
const norm = (l: AgentJob[]) => { if (!Array.isArray(l)) return EMPTY; let o = memo.get(l); if (!o) { o = deriveParents(l.map((j) => normalizeJob(j))); memo.set(l, o); } return o; };

export const getJobs = () => norm(readKey<AgentJob[]>(KEY, EMPTY));
export const useJobs = () => norm(useStoredValue<AgentJob[]>(KEY, EMPTY));
export function upsertJob(job: AgentJob) {
  const list = getJobs();
  writeKey(KEY, list.some((j) => j.id === job.id) ? list.map((j) => (j.id === job.id ? job : j)) : [job, ...list]);
}
export function patchJob(id: string, patch: Partial<AgentJob>) {
  const j = getJobs().find((x) => x.id === id);
  if (j) upsertJob({ ...j, ...patch, updatedAt: nowIso() });
}
export const removeJob = (id: string) => writeKey(KEY, getJobs().filter((j) => j.id !== id && j.parentJobId !== id));

export function makeJob(agentId: AgentId, p: { instruction: string; projectId?: string | null; parentJobId?: string | null; scriptInput?: ScriptAgentInput | null }): AgentJob {
  const at = nowIso();
  return { id: newId(), agentId, projectId: p.projectId ?? null, parentJobId: p.parentJobId ?? null, instruction: p.instruction, scriptInput: p.scriptInput ?? null, status: "queued", scriptOutput: null, childJobIds: [], message: "", model: null, createdAt: at, updatedAt: at, startedAt: null, finishedAt: null };
}

export type Runner = (args: { data: { agentId: AgentId; scriptInput: ScriptAgentInput | null } }) => Promise<RunAgentResult>;

/** Executes a queued job through the server and records the real outcome. */
export async function executeJob(id: string, run: Runner): Promise<void> {
  const job = getJobs().find((j) => j.id === id);
  if (!job) return;
  patchJob(id, { status: "running", startedAt: nowIso(), message: "" });
  try {
    const r = await run({ data: { agentId: job.agentId, scriptInput: job.scriptInput } });
    patchJob(id, {
      status: r.status,
      message: r.message,
      finishedAt: nowIso(),
      ...(r.status === "completed" ? { scriptOutput: r.scriptOutput, model: r.model } : {}),
    });
  } catch {
    patchJob(id, { status: "failed", message: "সার্ভারে পৌঁছানো যায়নি।", finishedAt: nowIso() });
  }
}

const DELEGATE: AgentId[] = ["script", "character", "animation", "voice", "editing", "thumbnail"];

export interface DelegationBrief { idea: string; platform: string; durationSec: number; style: string; projectId: string | null }

/**
 * Master Controller: deterministic routing (not AI). Agents without an executor are
 * recorded as waiting_connection immediately; the Script child is executed via the server.
 * Parent status is derived from children on every read.
 */
export function delegateBrief(b: DelegationBrief, run: Runner, scriptConnected: boolean): AgentJob {
  const idea = b.idea.trim();
  const parent = makeJob("controller", { instruction: idea, projectId: b.projectId });
  const at = nowIso();
  const children = DELEGATE.map((a) => {
    const j = makeJob(a, { instruction: idea, projectId: b.projectId, parentJobId: parent.id, scriptInput: a === "script" ? { idea: idea.padEnd(10, " "), platform: b.platform, durationSec: b.durationSec, language: "bn", style: b.style } : null });
    if (a === "script" && scriptConnected) return j;
    return { ...j, status: "waiting_connection" as const, finishedAt: at, message: a === "script" ? "টেক্সট AI সার্ভারে কনফিগার করা নেই — স্ক্রিপ্ট তৈরি হয়নি।" : NO_EXECUTOR_REASON };
  });
  const p: AgentJob = { ...parent, status: "running", childJobIds: children.map((c) => c.id), startedAt: at };
  writeKey(KEY, [p, ...children, ...readKey<AgentJob[]>(KEY, EMPTY)]);
  const script = children.find((c) => c.agentId === "script" && c.status === "queued");
  if (script) void executeJob(script.id, run);
  return p;
}

export function delegateProject(project: Project, run: Runner, scriptConnected: boolean): AgentJob {
  const brief = project.brief;
  const idea = [brief?.instruction ?? project.description ?? project.title, brief?.extraInstructions].filter(Boolean).join("\n") || project.title;
  return delegateBrief({ idea, platform: project.platform, durationSec: brief?.targetDurationSec ?? 30, style: brief?.videoType ?? "", projectId: project.id }, run, scriptConnected);
}

/** Turn a completed script job into an editable Script draft (existing model). */
export function scriptFromJob(job: AgentJob): Script | null {
  if (!job.scriptOutput || !job.scriptInput) return null;
  const at = nowIso();
  const lang = job.scriptInput.language;
  return {
    id: newId(), projectId: job.projectId, title: job.scriptOutput.title, idea: job.scriptInput.idea.trim(),
    platform: (["facebook_reels", "youtube_shorts", "instagram_reels"].includes(job.scriptInput.platform) ? job.scriptInput.platform : "facebook_reels") as Script["platform"],
    targetDurationSec: job.scriptInput.durationSec, language: (lang === "en" || lang === "banglish" ? lang : "bn"), style: job.scriptInput.style,
    characterIds: [], scenes: job.scriptOutput.scenes.map((s) => ({ id: newId(), ...s })), isExample: false, createdAt: at, updatedAt: at,
  };
}

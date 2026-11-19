import type { Approval, Project, StageKey, StageState, StageStatus } from "@/lib/store/types";

/** Production stages in pipeline order. "review" is the final human checkpoint. */
export const STAGE_ORDER: StageKey[] = [
  "script",
  "character",
  "animation",
  "voice",
  "editing",
  "thumbnail",
  "review",
];

export const PRODUCTION_STAGES: StageKey[] = STAGE_ORDER.filter((s) => s !== "review");

export const STAGE_STATUSES: StageStatus[] = [
  "not_started",
  "draft",
  "waiting_connection",
  "ready_review",
  "done",
  "failed",
];

export type JobStatus = "draft" | "waiting_connection" | "ready_review" | "approved" | "failed";

export function createInitialStages(at: string): Record<StageKey, StageState> {
  return Object.fromEntries(
    STAGE_ORDER.map((k) => [k, { status: "not_started", note: "", updatedAt: at }]),
  ) as Record<StageKey, StageState>;
}

export const INITIAL_APPROVAL: Approval = { approved: false, approvedAt: null, note: "" };

/**
 * Overall job status, derived only from user-recorded stage states:
 * - any failed stage → failed
 * - all production stages done + approval given → approved
 * - all production stages done → ready_review
 * - any stage waiting for a connection → waiting_connection
 * - otherwise → draft
 */
export function deriveJobStatus(project: Pick<Project, "stages" | "approval">): JobStatus {
  const states = STAGE_ORDER.map((k) => project.stages[k]?.status ?? "not_started");
  if (states.includes("failed")) return "failed";
  const productionDone = PRODUCTION_STAGES.every((k) => project.stages[k]?.status === "done");
  if (productionDone && project.approval.approved) return "approved";
  if (productionDone) return "ready_review";
  if (states.includes("waiting_connection")) return "waiting_connection";
  return "draft";
}

/** Approval is only allowed once every production stage is marked done and nothing failed. */
export function canApprove(project: Pick<Project, "stages" | "approval">): boolean {
  return deriveJobStatus(project) === "ready_review";
}

export function completedStageCount(project: Pick<Project, "stages">): number {
  return PRODUCTION_STAGES.filter((k) => project.stages[k]?.status === "done").length;
}

/**
 * Changing any production stage after approval invalidates the approval,
 * so nothing approved can drift silently.
 */
export function updateStage(
  project: Project,
  stage: StageKey,
  patch: Partial<Pick<StageState, "status" | "note">>,
  at: string,
): Project {
  const prev = project.stages[stage];
  const next: StageState = { ...prev, ...patch, updatedAt: at };
  const statusChanged = patch.status !== undefined && patch.status !== prev.status;
  const approval =
    statusChanged && stage !== "review" && project.approval.approved
      ? { ...INITIAL_APPROVAL, note: project.approval.note }
      : project.approval;
  const stages = { ...project.stages, [stage]: next };
  if (approval !== project.approval) {
    stages.review = { ...stages.review, status: "not_started", updatedAt: at };
  }
  return { ...project, stages, approval, updatedAt: at };
}

export function approveProject(project: Project, note: string, at: string): Project {
  if (!canApprove(project)) {
    throw new Error("All production stages must be done before approval.");
  }
  return {
    ...project,
    approval: { approved: true, approvedAt: at, note },
    stages: { ...project.stages, review: { status: "done", note, updatedAt: at } },
    updatedAt: at,
  };
}

export function revokeApproval(project: Project, at: string): Project {
  return {
    ...project,
    approval: { ...INITIAL_APPROVAL, note: project.approval.note },
    stages: {
      ...project.stages,
      review: { ...project.stages.review, status: "not_started", updatedAt: at },
    },
    updatedAt: at,
  };
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "খসড়া",
  waiting_connection: "সংযোগের অপেক্ষায়",
  ready_review: "রিভিউয়ের জন্য প্রস্তুত",
  approved: "অনুমোদিত",
  failed: "ব্যর্থ",
};

/**
 * Bring a stored project up to the current stage list (older records lack
 * newer stages such as "voice"). An approval that no longer matches "every
 * production stage done" is withdrawn instead of silently kept.
 */
export function normalizeProject(project: Project): Project {
  const stages = project.stages ?? ({} as Project["stages"]);
  const missing = STAGE_ORDER.filter((k) => !stages[k]);
  const approval = project.approval ?? INITIAL_APPROVAL;
  const allDone = PRODUCTION_STAGES.every((k) => stages[k]?.status === "done");
  const staleApproval = approval.approved && !allDone;
  if (missing.length === 0 && !staleApproval && project.approval) return project;

  const nextStages = { ...stages };
  for (const k of missing) nextStages[k] = { status: "not_started", note: "", updatedAt: project.updatedAt };
  let nextApproval = approval;
  if (staleApproval) {
    nextApproval = { ...INITIAL_APPROVAL, note: approval.note };
    nextStages.review = { ...nextStages.review, status: "not_started" };
  }
  return { ...project, stages: nextStages, approval: nextApproval };
}

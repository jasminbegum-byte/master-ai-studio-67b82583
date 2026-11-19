import { cva } from "class-variance-authority";

import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/production";
import { STAGE_STATUS_LABELS } from "@/lib/domain/labels";
import type { StageStatus } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const pill = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        draft: "border-status-draft/30 bg-status-draft/10 text-status-draft",
        waiting: "border-status-waiting/35 bg-status-waiting/10 text-status-waiting",
        review: "border-status-review/35 bg-status-review/10 text-status-review",
        done: "border-status-done/35 bg-status-done/10 text-status-done",
        failed: "border-status-failed/40 bg-status-failed/10 text-status-failed",
      },
    },
  },
);

type Tone = "draft" | "waiting" | "review" | "done" | "failed";

const STAGE_TONE: Record<StageStatus, Tone> = {
  not_started: "draft",
  draft: "draft",
  waiting_connection: "waiting",
  ready_review: "review",
  done: "done",
  failed: "failed",
};

const JOB_TONE: Record<JobStatus, Tone> = {
  draft: "draft",
  waiting_connection: "waiting",
  ready_review: "review",
  approved: "done",
  failed: "failed",
};

function Dot() {
  return <span aria-hidden className="size-1.5 rounded-full bg-current" />;
}

export function StagePill({ status, className }: { status: StageStatus; className?: string }) {
  return (
    <span className={cn(pill({ tone: STAGE_TONE[status] }), className)}>
      <Dot />
      {STAGE_STATUS_LABELS[status]}
    </span>
  );
}

export function JobPill({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <span className={cn(pill({ tone: JOB_TONE[status] }), className)}>
      <Dot />
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

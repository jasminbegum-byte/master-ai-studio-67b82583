import { describe, expect, it } from "vitest";

import { approveProject, canApprove, createInitialStages, deriveJobStatus, INITIAL_APPROVAL, updateStage } from "@/lib/domain/production";
import type { Project } from "@/lib/store/types";

const at = "2026-01-01T00:00:00.000Z";
function project(): Project {
  return { id: "p", title: "t", description: "", platform: "facebook_reels", isExample: false, createdAt: at, updatedAt: at, stages: createInitialStages(at), approval: INITIAL_APPROVAL };
}
function allDone(): Project {
  let p = project();
  for (const s of ["script", "character", "animation", "editing", "thumbnail"] as const) p = updateStage(p, s, { status: "done" }, at);
  return p;
}

describe("production rules", () => {
  it("new project is draft and cannot be approved", () => {
    expect(deriveJobStatus(project())).toBe("draft");
    expect(canApprove(project())).toBe(false);
  });
  it("any failed stage makes the job failed", () => {
    expect(deriveJobStatus(updateStage(project(), "editing", { status: "failed" }, at))).toBe("failed");
  });
  it("all production stages done → ready for review, approval allowed", () => {
    expect(deriveJobStatus(allDone())).toBe("ready_review");
    expect(deriveJobStatus(approveProject(allDone(), "", at))).toBe("approved");
  });
  it("changing a stage after approval revokes approval", () => {
    const p = updateStage(approveProject(allDone(), "", at), "thumbnail", { status: "draft" }, at);
    expect(p.approval.approved).toBe(false);
  });
});

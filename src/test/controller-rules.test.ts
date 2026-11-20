import { describe, expect, it } from "vitest";

import {
  buildStagePlan,
  createFromBrief,
  DEFAULT_BRIEF_INPUT,
  parseDurationInput,
  validateBrief,
  type BriefInput,
} from "@/lib/domain/controller";
import { canApprove, STAGE_ORDER, updateStage } from "@/lib/domain/production";

const at = "2026-01-01T00:00:00.000Z";
const ids = { projectId: "p1", scriptId: "s1" };
const valid: BriefInput = {
  ...DEFAULT_BRIEF_INPUT,
  instruction: "একটি ছোট বিড়াল বৃষ্টির দিনে ছাতা খুঁজে পায়",
  videoType: "কার্টুন গল্প",
};
const emptyCtx = { scripts: [], characterNames: [], animationCount: 0, editCount: 0, thumbnailCount: 0 };

describe("master controller rules", () => {
  it("rejects an idea shorter than 10 characters", () => {
    expect(validateBrief({ ...valid, instruction: "ছোট" }).instruction).toBeDefined();
  });
  it("rejects a missing video type", () => {
    expect(validateBrief({ ...valid, videoType: " " }).videoType).toBeDefined();
  });
  it("rejects durations outside 5–600 seconds", () => {
    expect(validateBrief({ ...valid, targetDurationSec: 4 }).targetDurationSec).toBeDefined();
    expect(validateBrief({ ...valid, targetDurationSec: 601 }).targetDurationSec).toBeDefined();
    expect(validateBrief({ ...valid, targetDurationSec: 30 })).toEqual({});
  });
  it("reads Bengali digits typed for the duration", () => {
    expect(parseDurationInput("৪৫")).toBe(45);
    expect(Number.isNaN(parseDurationInput("৪৫ সেকেন্ড"))).toBe(true);
  });
  it("defaults the platform to Facebook Reels", () => {
    expect(DEFAULT_BRIEF_INPUT.platform).toBe("facebook_reels");
  });
  it("stores the brief on a project and links an empty script draft", () => {
    const { project, script } = createFromBrief(valid, at, ids);
    expect(project.brief?.instruction).toBe(valid.instruction);
    expect(script?.projectId).toBe("p1");
    expect(script?.scenes).toEqual([]);
    expect(project.stages.script.status).toBe("draft");
    expect(project.approval.approved).toBe(false);
  });
  it("creates no script when the user opts out, and no stage starts as done", () => {
    const { project, script } = createFromBrief({ ...valid, createScriptDraft: false }, at, ids);
    expect(script).toBeNull();
    expect(STAGE_ORDER.some((s) => project.stages[s].status === "done")).toBe(false);
  });
  it("plans exactly the seven stages in order", () => {
    const { project } = createFromBrief(valid, at, ids);
    expect(buildStagePlan(project, emptyCtx).map((i) => i.stage)).toEqual([
      "script", "character", "animation", "voice", "editing", "thumbnail", "review",
    ]);
  });
  it("links the script step straight to the saved draft", () => {
    const { project, script } = createFromBrief(valid, at, ids);
    const plan = buildStagePlan(project, { ...emptyCtx, scripts: script ? [script] : [] });
    expect(plan[0]?.link.scriptId).toBe("s1");
  });
  it("a controller project cannot be approved until all production stages are done", () => {
    let { project } = createFromBrief(valid, at, ids);
    expect(canApprove(project)).toBe(false);
    for (const s of ["script", "character", "animation", "voice", "editing"] as const) project = updateStage(project, s, { status: "done" }, at);
    expect(canApprove(project)).toBe(false);
    project = updateStage(project, "thumbnail", { status: "done" }, at);
    expect(canApprove(project)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { buildMasterPlan } from "@/lib/agents/orchestrator";
import { AGENTS, getAgent } from "@/lib/agents/registry";

describe("master agent orchestration foundation", () => {
  const request = {
    title: "একটি শিক্ষামূলক গল্প",
    instruction: "একটি শিশুর সততা নিয়ে ছোট গল্প তৈরি করো",
    videoType: "শিক্ষামূলক",
    platform: "facebook_reels",
    targetDurationSec: 60,
  };

  it("registers the master controller and all specialist agents", () => {
    expect(AGENTS.map((agent) => agent.id)).toEqual([
      "master", "script", "character", "animation", "voice", "editing", "thumbnail", "job_manager",
    ]);
    expect(getAgent("script").name).toBe("স্ক্রিপ্ট এজেন্ট");
  });

  it("creates a delegation-ready plan in automatic mode", () => {
    const plan = buildMasterPlan(request, "automatic");
    expect(plan.mode).toBe("automatic");
    expect(plan.tasks.map((task) => task.id)).toContain("editing");
    expect(plan.tasks.find((task) => task.id === "animation")?.dependsOn).toEqual(["script", "character"]);
    expect(plan.tasks.every((task) => task.instructions.includes(request.instruction))).toBe(true);
  });

  it("keeps missing media providers explicit instead of claiming generation", () => {
    const plan = buildMasterPlan(request, "prompt");
    expect(plan.tasks.find((task) => task.id === "animation")?.execution).toBe("requires_provider");
    expect(plan.tasks.find((task) => task.id === "voice")?.execution).toBe("requires_provider");
    expect(plan.limitations.some((item) => item.includes("রেন্ডার"))).toBe(true);
  });

  it("rejects an empty or too-short request", () => {
    expect(() => buildMasterPlan({ instruction: "ছোট" }, "automatic")).toThrow();
  });
});

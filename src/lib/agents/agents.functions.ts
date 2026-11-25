import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { AGENT_IDS, EXECUTABLE_AGENTS, type AgentId, type ScriptAgentOutput } from "./registry";

export type RunAgentResult =
  | { status: "completed"; scriptOutput: ScriptAgentOutput | null; model: string | null; message: string }
  | { status: "waiting_connection"; message: string }
  | { status: "failed"; message: string };

const schema = z.object({
  agentId: z.enum(AGENT_IDS as [AgentId, ...AgentId[]]),
  scriptInput: z
    .object({
      idea: z.string().min(10).max(4000),
      platform: z.string().max(60),
      durationSec: z.number().min(5).max(600),
      language: z.string().max(40),
      style: z.string().max(300),
    })
    .nullable(),
});

/** Which agents have a working server executor right now. */
export const getAgentConnections = createServerFn({ method: "GET" }).handler(async () => {
  const { textProviderConfigured } = await import("./script-agent.server");
  const text = textProviderConfigured();
  return AGENT_IDS.map((id) => ({ id, connected: id === "controller" || (id === "script" && text) }));
});

export const runAgent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<RunAgentResult> => {
    if (!EXECUTABLE_AGENTS.includes(data.agentId) || data.agentId === "controller") {
      return { status: "waiting_connection", message: "এই এজেন্টের জন্য কোনো প্রোভাইডার/ব্যাকএন্ড সংযুক্ত নেই। কিছু তৈরি হয়নি।" };
    }
    const { runScriptAgent, textProviderConfigured, describeGatewayError, TEXT_MODEL } = await import("./script-agent.server");
    if (!textProviderConfigured()) return { status: "waiting_connection", message: "টেক্সট AI সংযোগ (সার্ভার কী) পাওয়া যায়নি।" };
    if (!data.scriptInput) return { status: "failed", message: "স্ক্রিপ্ট ইনপুট নেই।" };
    try {
      const out = await runScriptAgent(data.scriptInput);
      return { status: "completed", scriptOutput: out, model: TEXT_MODEL, message: `${out.scenes.length}টি দৃশ্য তৈরি হয়েছে` };
    } catch (error) {
      console.error("script agent error", error);
      if (error instanceof Error && error.message === "invalid_script_output") return { status: "failed", message: "AI-এর উত্তর সঠিক ফরম্যাটে আসেনি। আবার চালান।" };
      return { status: "failed", message: describeGatewayError(error) };
    }
  });

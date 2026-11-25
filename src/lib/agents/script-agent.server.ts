import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";

import { parseScriptOutput, type ScriptAgentInput, type ScriptAgentOutput } from "./registry";

export const TEXT_MODEL = "openai/gpt-6-astra" as const;

export function textProviderConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]);
}

type Res = Awaited<ReturnType<typeof generateResponse<typeof TEXT_MODEL>>>;
function extractText(res: Res): string {
  const parts: string[] = [];
  for (const item of res.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content) if (c.type === "output_text") parts.push(c.text);
  }
  return parts.join("");
}

export async function askText(system: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const res = await generateResponse({ model: TEXT_MODEL, instructions: system, input: messages.map((m) => ({ role: m.role, content: m.content })) });
  return extractText(res);
}

export function describeGatewayError(error: unknown): string {
  if (error instanceof GatewayError) {
    if (error.httpStatus === 402) return "AI ক্রেডিট শেষ — ওয়ার্কস্পেসে ক্রেডিট যোগ না হওয়া পর্যন্ত চলবে না।";
    if (error.httpStatus === 429) return "অনেক বেশি অনুরোধ — কিছুক্ষণ পরে আবার চেষ্টা করুন।";
    if (error.httpStatus === 401 || error.httpStatus === 403) return "AI সংযোগ অনুমোদিত নয় (সেটআপ সমস্যা)।";
  }
  return "AI থেকে উত্তর আনা যায়নি। আবার চেষ্টা করুন।";
}

export async function runScriptAgent(input: ScriptAgentInput): Promise<ScriptAgentOutput> {
  const system = [
    "তুমি একটি শর্ট-ভিডিও স্ক্রিপ্ট লেখক। ব্যবহারকারীর আইডিয়া থেকে দৃশ্য-ভিত্তিক স্ক্রিপ্ট লেখো।",
    `প্ল্যাটফর্ম: ${input.platform}। মোট দৈর্ঘ্য প্রায় ${input.durationSec} সেকেন্ড; দৃশ্যগুলোর সেকেন্ডের যোগফল এর কাছাকাছি রাখো।`,
    `ভাষা: ${input.language}। স্টাইল: ${input.style || "ব্যবহারকারীর আইডিয়া অনুযায়ী"}।`,
    "visual = ক্যামেরায় কী দেখা যাবে, narration = বলা কথা/সংলাপ। শুধু নির্ধারিত JSON দাও।",
  ].join("\n");
  const res = await generateResponse({
    model: TEXT_MODEL,
    instructions: system,
    input: input.idea,
    text: {
      format: {
        type: "json_schema",
        name: "script",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["title", "scenes"],
          properties: {
            title: { type: "string" },
            scenes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["visual", "narration", "durationSec"],
                properties: { visual: { type: "string" }, narration: { type: "string" }, durationSec: { type: "number" } },
              },
            },
          },
        },
      },
    },
  });
  let json: unknown = null;
  try { json = JSON.parse(extractText(res)); } catch { json = null; }
  const out = parseScriptOutput(json);
  if (!out) throw new Error("invalid_script_output");
  return out;
}

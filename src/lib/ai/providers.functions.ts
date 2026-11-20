import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ProviderSlotId } from "./provider-slots";

type ChatMessage = { role: "user" | "assistant"; content: string };
type TextAdapter = (messages: ChatMessage[]) => Promise<string>;

function getServerEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

const geminiTextAdapter: TextAdapter | undefined = getServerEnv("GEMINI_API_KEY")
  ? async (messages) => {
      const apiKey = getServerEnv("GEMINI_API_KEY");
      const model = getServerEnv("GEMINI_MODEL") || "gemini-2.5-flash";
      if (!apiKey) throw new Error("Gemini API key is missing");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: "তুমি Master AI Studio-এর বাংলা AI সহকারী। স্পষ্ট, বাস্তবসম্মত ও নিরাপদ উত্তর দাও। কোনো কাজ বাস্তবে করা না হলে সম্পন্ন হয়েছে বলে দাবি করবে না।" }],
            },
            contents: messages.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.text();
        console.error("Gemini API request failed", response.status, detail.slice(0, 1000));
        throw new Error(`Gemini API returned HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const reply = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
      if (!reply) throw new Error("Gemini returned an empty response");
      return reply;
    }
  : undefined;

const adapters: { text?: TextAdapter } = { text: geminiTextAdapter };

export interface ProviderStatus {
  id: ProviderSlotId;
  configured: boolean;
}

export const getProviderStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProviderStatus[]> => {
    const ids: ProviderSlotId[] = ["text", "image", "video", "voice", "editing", "publishing"];
    return ids.map((id) => ({ id, configured: id === "text" ? Boolean(adapters.text) : false }));
  },
);

const askSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(8000),
  })).min(1).max(50),
});

export type AskAssistantResult =
  | { ok: true; reply: string }
  | { ok: false; code: "provider_not_configured" | "provider_error"; message: string };

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data }): Promise<AskAssistantResult> => {
    const adapter = adapters.text;
    if (!adapter) return {
      ok: false,
      code: "provider_not_configured",
      message: "Gemini সংযোগের জন্য সার্ভার সিক্রেট GEMINI_API_KEY সেট করা হয়নি।",
    };
    try {
      return { ok: true, reply: await adapter(data.messages) };
    } catch (error) {
      console.error("assistant provider error", error);
      return { ok: false, code: "provider_error", message: "AI প্রোভাইডার থেকে উত্তর আনা যায়নি। সেটিংস ও সার্ভার লগ পরীক্ষা করুন।" };
    }
  });

const agentSchema = z.object({
  agentId: z.enum(["master", "script", "character", "animation", "voice", "editing", "thumbnail", "job_manager"]),
  mode: z.enum(["automatic", "prompt"]),
  instruction: z.string().min(10).max(8000),
  context: z.string().max(12000).optional(),
});

const agentRole: Record<z.infer<typeof agentSchema>["agentId"], string> = {
  master: "Master Controller: ভেঙে কাজ ভাগ করো, নির্ভরতা ও যাচাইয়ের ধাপ নির্ধারণ করো।",
  script: "Script Agent: বাংলা গল্পকে দৃশ্য, সংলাপ, ভয়েসওভার, সময় ও ভিজ্যুয়াল নির্দেশনায় সাজাও।",
  character: "Character Agent: চরিত্রের পরিচয়, চেহারা, পোশাক, কণ্ঠ ও দৃশ্যজুড়ে continuity bible তৈরি করো।",
  animation: "Animation Agent: দৃশ্যভিত্তিক অ্যানিমেশন নির্দেশনা ও Google Flow/Code Animation-এর কপি-যোগ্য প্রম্পট তৈরি করো; ভিডিও রেন্ডার হয়েছে দাবি কোরো না।",
  voice: "Voice Agent: বাংলা voiceover/dialogue, কণ্ঠের নির্দেশনা, বিরতি ও timing তৈরি করো; অডিও রেকর্ড হয়েছে দাবি কোরো না।",
  editing: "Editing Agent: কাট, ক্যাপশন, অডিও, টাইমলাইন ও export নির্দেশনা তৈরি করো; ভিডিও এডিট/রেন্ডার হয়েছে দাবি কোরো না।",
  thumbnail: "Thumbnail Agent: thumbnail concept, সংক্ষিপ্ত বাংলা on-image text, composition ও image prompt তৈরি করো; ছবি তৈরি হয়েছে দাবি কোরো না।",
  job_manager: "Job Manager: কাজের তালিকা, dependency, status, review checkpoint ও পরবর্তী কাজ নির্ধারণ করো।",
};

export const runSpecialistAgent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => agentSchema.parse(input))
  .handler(async ({ data }): Promise<AskAssistantResult> => {
    if (!adapters.text) return {
      ok: false,
      code: "provider_not_configured",
      message: "Gemini সংযোগের জন্য সার্ভার সিক্রেট GEMINI_API_KEY সেট করা হয়নি।",
    };
    const modeInstruction = data.mode === "automatic"
      ? "Automatic Mode: লক্ষ্য বিশ্লেষণ করে যুক্তিসঙ্গত সিদ্ধান্ত নাও। অনুমান ও সীমাবদ্ধতা আলাদা করে উল্লেখ করো।"
      : "Prompt Mode: ব্যবহারকারীর নির্দেশ হুবহু অগ্রাধিকার দাও। নির্দেশ অস্পষ্ট হলে অনুমান না করে প্রশ্ন বা সীমাবদ্ধতা জানাও।";
    const prompt = [
      agentRole[data.agentId],
      modeInstruction,
      data.context ? `প্রজেক্টের প্রেক্ষাপট:\n${data.context}` : "",
      `ব্যবহারকারীর কাজ:\n${data.instruction}`,
      "উত্তর বাংলায় দাও। কাজ বাস্তবে সম্পন্ন না হলে সম্পন্ন হয়েছে বলবে না।",
    ].filter(Boolean).join("\n\n");
    try {
      return { ok: true, reply: await adapters.text([{ role: "user", content: prompt }]) };
    } catch (error) {
      console.error("specialist agent error", error);
      return { ok: false, code: "provider_error", message: "এজেন্টের AI উত্তর আনা যায়নি। সার্ভার সংযোগ পরীক্ষা করুন।" };
    }
  });

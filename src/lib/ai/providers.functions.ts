import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ProviderSlotId } from "./provider-slots";

type ChatMessage = { role: "user" | "assistant"; content: string };
type TextAdapter = (messages: ChatMessage[]) => Promise<string>;

function getServerEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

/**
 * Google Gemini REST adapter. It runs only inside a TanStack server function.
 * Configure GEMINI_API_KEY as a server-side environment secret and optionally
 * GEMINI_MODEL. Never put either value in browser code or commit real secrets.
 */
const geminiTextAdapter: TextAdapter | undefined = getServerEnv("GEMINI_API_KEY")
  ? async (messages) => {
      const apiKey = getServerEnv("GEMINI_API_KEY");
      const model = getServerEnv("GEMINI_MODEL") || "gemini-2.5-flash";
      if (!apiKey) throw new Error("Gemini API key is missing");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
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
      const reply = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();
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
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(50),
});

export type AskAssistantResult =
  | { ok: true; reply: string }
  | { ok: false; code: "provider_not_configured" | "provider_error"; message: string };

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data }): Promise<AskAssistantResult> => {
    const adapter = adapters.text;
    if (!adapter) {
      return {
        ok: false,
        code: "provider_not_configured",
        message: "Gemini সংযোগের জন্য সার্ভার সিক্রেট GEMINI_API_KEY সেট করা হয়নি।",
      };
    }
    try {
      const reply = await adapter(data.messages);
      return { ok: true, reply };
    } catch (error) {
      console.error("assistant provider error", error);
      return { ok: false, code: "provider_error", message: "AI প্রোভাইডার থেকে উত্তর আনা যায়নি। সেটিংস ও সার্ভার লগ পরীক্ষা করুন।" };
    }
  });

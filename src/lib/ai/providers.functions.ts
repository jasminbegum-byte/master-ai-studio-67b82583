import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ProviderSlotId } from "./provider-slots";

/**
 * Server-side integration boundary for AI providers.
 *
 * No provider adapter is registered yet, so every slot reports "not configured"
 * and nothing is generated. To connect a provider later: store its key as a
 * server secret, implement an adapter here that reads process.env inside the
 * handler, and register it in `adapters`. Never read keys in browser code.
 */
type TextAdapter = (messages: { role: "user" | "assistant"; content: string }[]) => Promise<string>;

const adapters: { text?: TextAdapter } = {};

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
        message: "কোনো টেক্সট AI প্রোভাইডার সংযুক্ত নেই।",
      };
    }
    try {
      const reply = await adapter(data.messages);
      return { ok: true, reply };
    } catch (error) {
      console.error("assistant provider error", error);
      return { ok: false, code: "provider_error", message: "প্রোভাইডার থেকে উত্তর আনা যায়নি।" };
    }
  });

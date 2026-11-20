/** Shared registry for the specialist agents in Master AI Studio. */
export type AgentId =
  | "master"
  | "script"
  | "character"
  | "animation"
  | "voice"
  | "editing"
  | "thumbnail"
  | "job_manager";

export type AgentMode = "automatic" | "prompt";

export type AgentCapability =
  | "text_planning"
  | "image_generation"
  | "video_generation"
  | "voice_generation"
  | "video_editing"
  | "task_tracking";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  purpose: string;
  capability: AgentCapability;
  requiresApproval: boolean;
}

export const AGENTS: readonly AgentDefinition[] = [
  { id: "master", name: "মাস্টার কন্ট্রোলার", purpose: "সামগ্রিক কাজ বোঝা, ভাগ করা এবং এজেন্টদের সমন্বয় করা।", capability: "text_planning", requiresApproval: false },
  { id: "script", name: "স্ক্রিপ্ট এজেন্ট", purpose: "গল্প, দৃশ্য, সংলাপ ও ভয়েসওভার তৈরি করা।", capability: "text_planning", requiresApproval: false },
  { id: "character", name: "ক্যারেক্টার এজেন্ট", purpose: "চরিত্রের পরিচয়, চেহারা ও ধারাবাহিকতার বিবরণ তৈরি করা।", capability: "text_planning", requiresApproval: false },
  { id: "animation", name: "অ্যানিমেশন এজেন্ট", purpose: "দৃশ্যের অ্যানিমেশন পরিকল্পনা ও জেনারেশন নির্দেশনা তৈরি করা।", capability: "video_generation", requiresApproval: true },
  { id: "voice", name: "ভয়েস এজেন্ট", purpose: "ভয়েসওভার স্ক্রিপ্ট ও কণ্ঠের নির্দেশনা প্রস্তুত করা।", capability: "voice_generation", requiresApproval: true },
  { id: "editing", name: "এডিটিং এজেন্ট", purpose: "ভিডিও কাট, ক্যাপশন, অডিও ও রেন্ডারিংয়ের কাজ সাজানো।", capability: "video_editing", requiresApproval: true },
  { id: "thumbnail", name: "থাম্বনেইল এজেন্ট", purpose: "থাম্বনেইলের কনসেপ্ট, লেখা ও ইমেজ প্রম্পট তৈরি করা।", capability: "image_generation", requiresApproval: true },
  { id: "job_manager", name: "জব ম্যানেজার", purpose: "কাজের অবস্থা, নির্ভরতা ও ইতিহাস ট্র্যাক করা।", capability: "task_tracking", requiresApproval: false },
] as const;

export function getAgent(id: AgentId): AgentDefinition {
  const agent = AGENTS.find((item) => item.id === id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}

import { AGENTS, type AgentId, type AgentMode } from "./registry";

export interface ProductionRequest {
  title?: string;
  instruction: string;
  videoType?: string;
  platform?: string;
  targetDurationSec?: number;
  extraInstructions?: string;
}

export interface DelegatedTask {
  id: AgentId;
  title: string;
  objective: string;
  instructions: string;
  mode: AgentMode;
  dependsOn: AgentId[];
  execution: "available" | "requires_provider" | "approval_required";
}

export interface MasterPlan {
  summary: string;
  mode: AgentMode;
  tasks: DelegatedTask[];
  limitations: string[];
}

/**
 * Builds a transparent delegation plan. This function does not claim to run
 * media-generation tools: unavailable provider capabilities remain explicit.
 */
export function buildMasterPlan(
  request: ProductionRequest,
  mode: AgentMode,
): MasterPlan {
  const brief = request.instruction.trim();
  if (brief.length < 10) throw new Error("নির্দেশ কমপক্ষে ১০ অক্ষরের হতে হবে।");

  const context = [
    request.title ? `প্রজেক্ট: ${request.title}` : "",
    `মূল নির্দেশ: ${brief}`,
    request.videoType ? `ভিডিওর ধরন: ${request.videoType}` : "",
    request.platform ? `প্ল্যাটফর্ম: ${request.platform}` : "",
    request.targetDurationSec ? `লক্ষ্য দৈর্ঘ্য: ${request.targetDurationSec} সেকেন্ড` : "",
    request.extraInstructions ? `অতিরিক্ত নির্দেশ: ${request.extraInstructions}` : "",
  ].filter(Boolean).join("\n");

  const ordered: { id: AgentId; dependsOn: AgentId[]; execution: DelegatedTask["execution"]; objective: string }[] = [
    { id: "script", dependsOn: [], execution: "available", objective: "সম্পূর্ণ গল্পকে দৃশ্য, সংলাপ, ভিজ্যুয়াল ও সময়সহ স্ক্রিপ্টে ভাগ করুন।" },
    { id: "character", dependsOn: ["script"], execution: "available", objective: "স্ক্রিপ্ট থেকে চরিত্রের তালিকা, স্থায়ী চেহারা, পোশাক ও continuity bible তৈরি করুন।" },
    { id: "animation", dependsOn: ["script", "character"], execution: "requires_provider", objective: "প্রতিটি দৃশ্যের অ্যানিমেশন নির্দেশনা ও রেন্ডার-প্রস্তুত প্রম্পট তৈরি করুন।" },
    { id: "voice", dependsOn: ["script"], execution: "requires_provider", objective: "সংলাপ, narrator direction, voice profile ও timing প্রস্তুত করুন।" },
    { id: "editing", dependsOn: ["animation", "voice"], execution: "requires_provider", objective: "দৃশ্য ও অডিও সাজিয়ে কাট, ক্যাপশন, সাউন্ড ও export plan তৈরি করুন।" },
    { id: "thumbnail", dependsOn: ["script", "character"], execution: "approval_required", objective: "প্ল্যাটফর্ম অনুযায়ী thumbnail concept, on-image copy ও image prompt তৈরি করুন।" },
    { id: "job_manager", dependsOn: ["script", "character", "animation", "voice", "editing", "thumbnail"], execution: "available", objective: "প্রতিটি কাজের status, dependency, review checkpoint ও পরবর্তী পদক্ষেপ ট্র্যাক করুন।" },
  ];

  const tasks = ordered.map((task): DelegatedTask => {
    const agent = AGENTS.find((item) => item.id === task.id)!;
    const instructions = [
      `তুমি ${agent.name}।`,
      `তোমার কাজ: ${agent.purpose}`,
      `নির্দিষ্ট লক্ষ্য: ${task.objective}`,
      "প্রজেক্টের প্রেক্ষাপট:",
      context,
      mode === "prompt"
        ? "ব্যবহারকারীর স্পষ্ট নির্দেশ অগ্রাধিকার পাবে। নির্দেশে অস্পষ্টতা থাকলে অনুমান না করে তা চিহ্নিত করো।"
        : "স্বয়ংক্রিয় মোড: কাজ বিশ্লেষণ করে যুক্তিসঙ্গত সিদ্ধান্ত নাও; গুরুত্বপূর্ণ অনিশ্চয়তা ও অনুমান স্পষ্ট করো।",
      "যে সক্ষমতা সংযুক্ত নেই, সেটি সম্পন্ন হয়েছে বলে দাবি করবে না।",
    ].join("\n\n");

    return {
      id: task.id,
      title: agent.name,
      objective: task.objective,
      instructions,
      mode,
      dependsOn: task.dependsOn,
      execution: task.execution,
    };
  });

  return {
    summary: `${tasks.length}টি বিশেষায়িত কাজের পরিকল্পনা তৈরি হয়েছে।`,
    mode,
    tasks,
    limitations: [
      "এই পরিকল্পনা তৈরি করা হয়েছে; এটি নিজে থেকে ছবি, ভিডিও, ভয়েস বা এডিট রেন্ডার করে না।",
      "মিডিয়া কাজ চালাতে সংশ্লিষ্ট নিরাপদ সার্ভার-সাইড প্রোভাইডার ও অনুমোদন প্রয়োজন।",
      "Facebook-এ প্রকাশের আগে ব্যবহারকারীর আলাদা চূড়ান্ত অনুমোদন বাধ্যতামূলক।",
    ],
  };
}

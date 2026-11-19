import { characters, newId, nowIso, projects, scripts } from "@/lib/store/collections";
import { createInitialStages, INITIAL_APPROVAL } from "./production";

/** Adds one clearly labelled, deletable example template. Never called automatically. */
export function addExampleTemplate() {
  const at = nowIso();
  const projectId = newId();
  const characterId = newId();
  characters.upsert({
    id: characterId,
    name: "[উদাহরণ] মিঠু বিড়াল",
    visualDescription: "ছোট কমলা রঙের কার্টুন বিড়াল, বড় সবুজ চোখ, গোল মুখ",
    clothing: "লাল স্কার্ফ",
    voiceNotes: "উচ্ছ্বসিত, শিশুসুলভ কণ্ঠ",
    continuityNotes: "স্কার্ফ সবসময় বাম দিকে বাঁধা; লেজের ডগা সাদা",
    isExample: true,
    createdAt: at,
    updatedAt: at,
  });
  projects.upsert({
    id: projectId,
    title: "[উদাহরণ] মিঠুর বৃষ্টির দিন",
    description: "এটি একটি উদাহরণ টেমপ্লেট — বাস্তব কাজ নয়। চাইলে মুছে ফেলুন।",
    platform: "facebook_reels",
    isExample: true,
    createdAt: at,
    updatedAt: at,
    stages: createInitialStages(at),
    approval: INITIAL_APPROVAL,
  });
  scripts.upsert({
    id: newId(),
    projectId,
    title: "[উদাহরণ] মিঠুর বৃষ্টির দিন",
    idea: "বৃষ্টিতে আটকে পড়া এক বিড়াল ছাতা খুঁজে পায় এবং একটি ছোট পাখিকে আশ্রয় দেয়।",
    platform: "facebook_reels",
    targetDurationSec: 30,
    language: "bn",
    style: "উষ্ণ, মজার কার্টুন",
    characterIds: [characterId],
    scenes: [
      { id: newId(), visual: "জানালার পাশে মিঠু, বাইরে ঝুম বৃষ্টি", narration: "আজ আবার বৃষ্টি!", durationSec: 8 },
      { id: newId(), visual: "মিঠু একটা পুরনো ছাতা খুঁজে পায়", narration: "এই তো, আমার ছাতা!", durationSec: 10 },
      { id: newId(), visual: "ছাতার নিচে ভেজা পাখিকে ডাকে", narration: "এসো, একসাথে থাকি।", durationSec: 12 },
    ],
    isExample: true,
    createdAt: at,
    updatedAt: at,
  });
}

export function removeExampleTemplates() {
  projects.replaceAll(projects.getAll().filter((p) => !p.isExample));
  scripts.replaceAll(scripts.getAll().filter((s) => !s.isExample));
  characters.replaceAll(characters.getAll().filter((c) => !c.isExample));
}

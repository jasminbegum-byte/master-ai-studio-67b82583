/**
 * Provider slots the studio can later connect. Browser-safe metadata only —
 * credentials must live in server-side secrets and are never read in the client.
 */
export type ProviderSlotId = "text" | "image" | "video" | "voice" | "editing" | "publishing";

export interface ProviderSlot {
  id: ProviderSlotId;
  title: string;
  usedBy: string;
  requirement: string;
}

export const PROVIDER_SLOTS: ProviderSlot[] = [
  {
    id: "text",
    title: "টেক্সট AI (চ্যাট ও স্ক্রিপ্ট)",
    usedBy: "মিনি AI অ্যাসিস্ট্যান্ট, স্ক্রিপ্ট এজেন্ট",
    requirement: "একটি টেক্সট মডেল প্রোভাইডার ও সার্ভার-সাইড সিক্রেট কী",
  },
  {
    id: "image",
    title: "ইমেজ মডেল",
    usedBy: "থাম্বনেইল স্টুডিও, ক্যারেক্টার রেফারেন্স",
    requirement: "একটি ইমেজ জেনারেশন মডেল ও সার্ভার-সাইড সিক্রেট কী",
  },
  {
    id: "video",
    title: "ভিডিও / অ্যানিমেশন রেন্ডার",
    usedBy: "অ্যানিমেশন ইঞ্জিন (Code Animation রেন্ডার)",
    requirement: "কোড-রেন্ডার সার্ভিস বা ভিডিও মডেল; Google Flow আলাদাভাবে Flow-এর সাইটে চলে",
  },
  {
    id: "voice",
    title: "ভয়েস / টেক্সট-টু-স্পিচ",
    usedBy: "মাস্টার কন্ট্রোলারের ভয়েস ধাপ",
    requirement: "একটি ভয়েস (TTS) প্রোভাইডার ও সার্ভার-সাইড সিক্রেট কী",
  },
  {
    id: "editing",
    title: "ভিডিও এডিটিং ব্যাকএন্ড",
    usedBy: "এডিটিং এজেন্ট",
    requirement: "ভিডিও প্রসেসিং সার্ভার (কাট, ক্যাপশন, রেন্ডার)",
  },
  {
    id: "publishing",
    title: "Facebook প্রকাশ",
    usedBy: "প্রোডাকশন মনিটর (চূড়ান্ত অনুমোদনের পরে)",
    requirement: "Facebook Page অনুমতি + প্রতিবার আলাদা স্পষ্ট নিশ্চিতকরণ। স্বয়ংক্রিয় প্রকাশ বন্ধ।",
  },
];

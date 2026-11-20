import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, ImageIcon, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ChipPicker } from "@/components/common/ChipPicker";
import { AgentAssistPanel } from "@/components/agents/AgentAssistPanel";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { EmptyState } from "@/components/common/EmptyState";
import { FieldError } from "@/components/common/FieldError";
import { HydrationGate } from "@/components/common/HydrationGate";
import { NotConnectedNotice } from "@/components/common/NotConnectedNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { ProjectSelect } from "@/components/common/ProjectSelect";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copyText, downloadText, safeFilename } from "@/lib/download";
import { ASPECT_LABELS, formatBnDate, toBnDigits } from "@/lib/domain/labels";
import { buildThumbnailPrompt } from "@/lib/domain/prompts";
import { newId, nowIso, thumbnails } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { AspectRatio, ThumbnailBrief } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/thumbnail")({
  head: () => ({
    meta: [
      { title: "থাম্বনেইল স্টুডিও — Master AI Studio" },
      { name: "description", content: "বাংলা টেক্সট, অনুপাত ও স্টাইল দিয়ে থাম্বনেইল ব্রিফ ও প্রম্পট তৈরি করুন।" },
      { property: "og:title", content: "থাম্বনেইল স্টুডিও — Master AI Studio" },
      { property: "og:description", content: "থাম্বনেইল প্রম্পট বিল্ডার ও ব্রিফ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThumbPage,
});

const STYLES = ["উজ্জ্বল কার্টুন", "সিনেমাটিক", "মিনিমাল", "ভৌতিক অন্ধকার", "মজার রঙিন"];

function empty(): ThumbnailBrief {
  const at = nowIso();
  return { id: newId(), projectId: null, text: "", aspectRatio: "9:16", style: "", mood: "", extraNotes: "", referenceName: null, referenceKind: null, createdAt: at, updatedAt: at };
}

function ThumbPage() {
  return (
    <>
      <PageHeader icon={ImageIcon} title="থাম্বনেইল স্টুডিও" description="ব্রিফ লিখুন, প্রম্পট কপি করুন, পরে ইমেজ মডেলে ব্যবহার করুন।" />
      <HydrationGate>
        <ThumbBody />
      </HydrationGate>
    </>
  );
}

function ThumbBody() {
  const list = thumbnails.useAll();
  const [d, setD] = useState<ThumbnailBrief>(() => empty());
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ThumbnailBrief>(k: K, v: ThumbnailBrief[K]) => setD((x) => ({ ...x, [k]: v }));
  const prompt = buildThumbnailPrompt({ ...d, hasReference: Boolean(d.referenceName) });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (d.text.trim().length < 2) return setError("থাম্বনেইলের টেক্সট লিখুন।");
    setError(null);
    const saved = { ...d, updatedAt: nowIso() };
    if (safeSave(() => thumbnails.upsert(saved), "ব্রিফ সংরক্ষিত হয়েছে")) setD(saved);
  }

  return (
    <div className="space-y-5">
      <NotConnectedNotice title="ইমেজ মডেল">ইমেজ মডেল সংযুক্ত নয়, তাই কোনো ছবি তৈরি হয় না। প্রম্পট ও ব্রিফ সংরক্ষণ কাজ করে।</NotConnectedNotice>\n      <AgentAssistPanel agentId="thumbnail" title="AI Thumbnail Agent" instruction={`এই থাম্বনেইল ব্রিফের জন্য আরও কার্যকর কনসেপ্ট, কম শব্দের বাংলা শিরোনাম এবং বিস্তারিত image prompt তৈরি করো: ${prompt}`} context={`স্টাইল: ${d.style}\\nমুড: ${d.mood}\\nঅনুপাত: ${d.aspectRatio}\\nঅতিরিক্ত নোট: ${d.extraNotes}`} />
      <form onSubmit={submit} noValidate>
        <Section title="থাম্বনেইল ব্রিফ">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="th-text">থাম্বনেইলের বাংলা টেক্সট *</Label>
                <Input id="th-text" value={d.text} onChange={(e) => set("text", e.target.value)} placeholder="যেমন: ভূতের বাড়ির রহস্য!" />
              </div>
              <div className="flex gap-2" role="radiogroup" aria-label="অনুপাত">
                {(["9:16", "16:9"] as AspectRatio[]).map((a) => (
                  <Button key={a} type="button" role="radio" aria-checked={d.aspectRatio === a} variant={d.aspectRatio === a ? "default" : "studio"} onClick={() => set("aspectRatio", a)}>
                    {ASPECT_LABELS[a]}
                  </Button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="th-style">স্টাইল</Label>
                <Input id="th-style" value={d.style} onChange={(e) => set("style", e.target.value)} />
                <ChipPicker label="স্টাইল সাজেশন" options={STYLES} value={d.style} onPick={(v) => set("style", v)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="th-mood">মুড / রং</Label>
                <Input id="th-mood" value={d.mood} onChange={(e) => set("mood", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="th-notes">অতিরিক্ত নোট</Label>
                <Textarea id="th-notes" rows={2} value={d.extraNotes} onChange={(e) => set("extraNotes", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="th-ref">রেফারেন্স ছবি/ভিডিও (ঐচ্ছিক)</Label>
                <Input
                  id="th-ref"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (refUrl) URL.revokeObjectURL(refUrl);
                    setRefUrl(URL.createObjectURL(f));
                    setD((x) => ({ ...x, referenceName: f.name, referenceKind: f.type.startsWith("video/") ? "video" : "image" }));
                  }}
                />
              </div>
              <ProjectSelect id="th-project" value={d.projectId} onChange={(v) => set("projectId", v)} />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">লেআউট প্রিভিউ (ছবি তৈরি নয়)</p>
              <div className={cn("film-grain mx-auto grid place-items-center overflow-hidden rounded-xl border border-border bg-surface p-4", d.aspectRatio === "9:16" ? "aspect-[9/16] w-48" : "aspect-video w-full")}>
                {refUrl && d.referenceKind === "image" && <img src={refUrl} alt="রেফারেন্স" className="max-h-24 rounded-md object-contain opacity-70" />}
                <p className="text-center font-display text-xl font-bold text-primary">{d.text || "আপনার টেক্সট"}</p>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-sm text-foreground/90">{prompt}</pre>
              <Button
                type="button"
                variant="studio"
                onClick={async () => {
                  if (await copyText(prompt)) toast.success("প্রম্পট কপি হয়েছে");
                  else toast.error("কপি করা যায়নি");
                }}
              >
                <Copy /> প্রম্পট কপি
              </Button>
            </div>
          </div>
          <FieldError id="th-err" message={error} />
          <Button type="submit" className="mt-4">
            <Save /> ব্রিফ সংরক্ষণ
          </Button>
        </Section>
      </form>
      <Section title={`সংরক্ষিত ব্রিফ (${toBnDigits(list.length)})`}>
        {list.length === 0 ? (
          <EmptyState icon={ImageIcon} title="কোনো ব্রিফ নেই" />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {list.map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-surface p-3">
                <p className="font-medium text-foreground">{t.text}</p>
                <p className="text-xs text-muted-foreground">{t.aspectRatio} · {formatBnDate(t.updatedAt)}</p>
                <div className="mt-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setD(t)}>এডিট</Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadText(buildThumbnailPrompt({ ...t, hasReference: Boolean(t.referenceName) }), `${safeFilename(t.text)}.txt`)}>
                    <Download /> টেক্সট
                  </Button>
                  <ConfirmDelete itemLabel={t.text} onConfirm={() => safeSave(() => thumbnails.remove(t.id), "ব্রিফ মুছে ফেলা হয়েছে")} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

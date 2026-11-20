import { createFileRoute } from "@tanstack/react-router";
import { FileVideo, Pencil, Save, Scissors, Sparkles, Type, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { AgentAssistPanel } from "@/components/agents/AgentAssistPanel";
import { EmptyState } from "@/components/common/EmptyState";
import { FieldError } from "@/components/common/FieldError";
import { HydrationGate } from "@/components/common/HydrationGate";
import { NotConnectedNotice } from "@/components/common/NotConnectedNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { ProjectSelect, useProjectTitle } from "@/components/common/ProjectSelect";
import { Section } from "@/components/common/Section";
import { StagePill } from "@/components/common/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EDITING_MODE_LABELS, formatBnDate, formatBytes, toBnDigits } from "@/lib/domain/labels";
import { edits, newId, nowIso } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { EditingMode, EditingRequest } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/editing")({
  head: () => ({
    meta: [
      { title: "এডিটিং এজেন্ট — Master AI Studio" },
      { name: "description", content: "ভিডিও বেছে নিয়ে অটোমেটিক বা প্রম্পট মোডে এডিটিং নির্দেশনা সংরক্ষণ করুন।" },
      { property: "og:title", content: "এডিটিং এজেন্ট — Master AI Studio" },
      { property: "og:description", content: "অটোমেটিক মোড ও প্রম্পট মোডে এডিটিং অনুরোধ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditingPage,
});

const AUTO_OPTIONS = [
  "নীরব অংশ কেটে ফেলা",
  "বাংলা অটো-ক্যাপশন",
  "কালার ঠিক করা",
  "ব্যাকগ্রাউন্ড মিউজিক",
  "৯:১৬ রিফ্রেম",
  "শুরুতে শক্ত হুক",
];

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

function emptyRequest(): EditingRequest {
  const at = nowIso();
  return {
    id: newId(),
    projectId: null,
    title: "",
    mode: "automatic",
    instruction: "",
    autoOptions: [],
    videoName: null,
    videoSizeBytes: null,
    videoDurationSec: null,
    createdAt: at,
    updatedAt: at,
  };
}

function EditingPage() {
  return (
    <>
      <PageHeader
        icon={Scissors}
        title="এডিটিং এজেন্ট"
        description="ভিডিও রিভিউ করুন আর কী ধরনের এডিট চান তা লিখে রাখুন।"
      />
      <HydrationGate>
        <EditingBody />
      </HydrationGate>
    </>
  );
}

function EditingBody() {
  const list = edits.useAll();
  const projectTitle = useProjectTitle();
  const [editing, setEditing] = useState<EditingRequest>(() => emptyRequest());
  const [key, setKey] = useState(0);
  const open = (r: EditingRequest) => {
    setEditing(r);
    setKey((k) => k + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <NotConnectedNotice title="ভিডিও এডিটিং ব্যাকএন্ড">
        এই অ্যাপ এখন কোনো ভিডিও কাটে, জোড়ে বা রেন্ডার করে না। আপনার নির্দেশনা সংরক্ষিত থাকবে এবং ‘সংযোগের অপেক্ষায়’
        অবস্থায় থাকবে। এডিট চালাতে একটি ভিডিও প্রসেসিং সার্ভার যুক্ত করতে হবে।
      </NotConnectedNotice>
      <RequestForm key={key} initial={editing} onSaved={setEditing} onNew={() => open(emptyRequest())} />
      <Section title={`সংরক্ষিত এডিটিং অনুরোধ (${toBnDigits(list.length)})`}>
        {list.length === 0 ? (
          <EmptyState icon={Scissors} title="কোনো অনুরোধ নেই" description="উপরের ফর্মে এডিটিং নির্দেশনা সংরক্ষণ করুন।" />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {list.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{r.title}</p>
                  <StagePill status="waiting_connection" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {EDITING_MODE_LABELS[r.mode]} · {r.videoName ?? "ভিডিও নেই"} · {formatBnDate(r.updatedAt)}
                  {projectTitle(r.projectId) && ` · ${projectTitle(r.projectId)}`}
                </p>
                <div className="mt-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => open(r)}>
                    <Pencil /> এডিট
                  </Button>
                  <ConfirmDelete
                    itemLabel={r.title}
                    onConfirm={() => {
                      safeSave(() => edits.remove(r.id), "অনুরোধ মুছে ফেলা হয়েছে");
                      if (editing.id === r.id) open(emptyRequest());
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

const MODES: { id: EditingMode; icon: typeof Sparkles; desc: string }[] = [
  { id: "automatic", icon: Sparkles, desc: "পছন্দের অপশনগুলো বেছে দিন; ব্যাকএন্ড যুক্ত হলে সেগুলো প্রয়োগ হবে।" },
  { id: "prompt", icon: Type, desc: "নিজের ভাষায় ঠিক কী এডিট চান তা লিখে দিন।" },
];

function RequestForm({
  initial,
  onSaved,
  onNew,
}: {
  initial: EditingRequest;
  onSaved: (r: EditingRequest) => void;
  onNew: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const exists = edits.get(initial.id) !== undefined;
  const set = <K extends keyof EditingRequest>(k: K, v: EditingRequest[K]) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setError("শুধু ভিডিও ফাইল বেছে নিন।");
    if (file.size > MAX_VIDEO_BYTES) return setError("ভিডিওটি ৫০০ MB-এর বেশি; ছোট ফাইল বাছুন।");
    setError(null);
    setVideoUrl(URL.createObjectURL(file));
    setDraft((d) => ({ ...d, videoName: file.name, videoSizeBytes: file.size, videoDurationSec: null }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.title.trim().length < 2) return setError("শিরোনাম কমপক্ষে ২ অক্ষরের দিন।");
    if (draft.mode === "prompt" && draft.instruction.trim().length < 5)
      return setError("প্রম্পট মোডে এডিটিং নির্দেশনা লিখুন।");
    if (draft.mode === "automatic" && draft.autoOptions.length === 0)
      return setError("অটোমেটিক মোডে অন্তত একটি অপশন বাছুন।");
    setError(null);
    const saved = { ...draft, title: draft.title.trim(), updatedAt: nowIso() };
    if (safeSave(() => edits.upsert(saved), exists ? "অনুরোধ হালনাগাদ হয়েছে" : "এডিটিং অনুরোধ সংরক্ষিত হয়েছে")) onSaved(saved);
  }

  return (
    <form onSubmit={submit} noValidate>
      <Section
        title={exists ? "অনুরোধ সম্পাদনা" : "নতুন এডিটিং অনুরোধ"}
        actions={
          exists ? (
            <Button type="button" variant="studio" size="sm" onClick={onNew}>
              নতুন
            </Button>
          ) : null
        }
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="এডিটিং মোড">
              {MODES.map((m) => {
                const on = draft.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("mode", m.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40",
                    )}
                  >
                    <m.icon className={cn("mt-0.5 size-5 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                    <span>
                      <span className="block font-medium text-foreground">{EDITING_MODE_LABELS[m.id]}</span>
                      <span className="block text-xs text-muted-foreground">{m.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-title">শিরোনাম *</Label>
              <Input id="ed-title" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="যেমন: পর্ব ১ — ফাইনাল কাট" />
            </div>
            <ProjectSelect id="ed-project" value={draft.projectId} onChange={(v) => set("projectId", v)} />
            {draft.mode === "automatic" ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">অটোমেটিক অপশন</legend>
                {AUTO_OPTIONS.map((o) => {
                  const id = `ao-${AUTO_OPTIONS.indexOf(o)}`;
                  return (
                    <div key={o} className="flex items-center gap-3">
                      <Checkbox
                        id={id}
                        checked={draft.autoOptions.includes(o)}
                        onCheckedChange={(v) =>
                          set("autoOptions", v === true ? [...draft.autoOptions, o] : draft.autoOptions.filter((x) => x !== o))
                        }
                      />
                      <Label htmlFor={id} className="font-normal">
                        {o}
                      </Label>
                    </div>
                  );
                })}
                <Textarea
                  rows={2}
                  aria-label="অতিরিক্ত নোট"
                  placeholder="অতিরিক্ত নোট (ঐচ্ছিক)"
                  value={draft.instruction}
                  onChange={(e) => set("instruction", e.target.value)}
                />
              </fieldset>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ed-instr">এডিটিং নির্দেশনা *</Label>
                <Textarea
                  id="ed-instr"
                  rows={6}
                  value={draft.instruction}
                  onChange={(e) => set("instruction", e.target.value)}
                  placeholder="যেমন: প্রথম ৩ সেকেন্ডে টাইটেল দাও, ০:১২–০:১৫ কেটে দাও, শেষে লোগো…"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">রিভিউর জন্য ভিডিও</p>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-video w-full rounded-xl border border-border bg-background object-contain"
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d)) set("videoDurationSec", Math.round(d));
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="film-grain grid aspect-video w-full place-items-center rounded-xl border border-dashed border-border bg-surface p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <Upload className="mx-auto size-7 text-muted-foreground" aria-hidden />
                  <span className="mt-2 block text-sm text-foreground">
                    {draft.videoName ? "আগের ভিডিওটি আবার বাছুন" : "ফোন থেকে ভিডিও বাছুন"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">ফাইলটি আপলোড হয় না, শুধু এই ডিভাইসে প্লে হয়</span>
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="sr-only"
              aria-label="ভিডিও ফাইল বাছুন"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {draft.videoName && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <FileVideo className="size-4 text-muted-foreground" aria-hidden />
                <span className="break-all text-foreground/90">{draft.videoName}</span>
                {draft.videoSizeBytes !== null && <Badge variant="muted">{formatBytes(draft.videoSizeBytes)}</Badge>}
                {draft.videoDurationSec !== null && (
                  <Badge variant="muted">{toBnDigits(draft.videoDurationSec)} সেকেন্ড</Badge>
                )}
                {videoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                    বদলান
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="ভিডিও সরান"
                  onClick={() => {
                    setVideoUrl(null);
                    setDraft((d) => ({ ...d, videoName: null, videoSizeBytes: null, videoDurationSec: null }));
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <X /> সরান
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              শুধু ফাইলের নাম, আকার ও সময় সংরক্ষিত হয়; ভিডিওটি নিজে ব্রাউজারে জমা থাকে না।
            </p>
          </div>
        </div>
        <FieldError id="ed-err" message={error} />
        <div className="mt-4">
          <Button type="submit">
            <Save /> {exists ? "পরিবর্তন সংরক্ষণ" : "অনুরোধ সংরক্ষণ"}
          </Button>
        </div>
      </Section>
    </form>
  );
}

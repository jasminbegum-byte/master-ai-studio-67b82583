import { createFileRoute } from "@tanstack/react-router";
import { Clapperboard, Code2, Copy, ExternalLink, FilePlus2, Pencil, Save, Wand2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { CodePreview } from "@/components/animation/CodePreview";
import { AgentAssistPanel } from "@/components/agents/AgentAssistPanel";
import { ChipPicker } from "@/components/common/ChipPicker";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { EmptyState } from "@/components/common/EmptyState";
import { FieldError } from "@/components/common/FieldError";
import { HydrationGate } from "@/components/common/HydrationGate";
import { PageHeader } from "@/components/common/PageHeader";
import { ProjectSelect, useProjectTitle } from "@/components/common/ProjectSelect";
import { Section } from "@/components/common/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copyText } from "@/lib/download";
import { ENGINE_LABELS, formatBnDate, GOOGLE_FLOW_URL, toBnDigits } from "@/lib/domain/labels";
import { buildFlowPrompt } from "@/lib/domain/prompts";
import { animations, characters, newId, nowIso } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { AnimationEngine, AnimationSpec } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/animation")({
  head: () => ({
    meta: [
      { title: "অ্যানিমেশন ইঞ্জিন — Master AI Studio" },
      { name: "description", content: "Code Animation বা Google Flow — নিজে ইঞ্জিন বেছে নিয়ে অ্যানিমেশন স্পেক ও প্রম্পট তৈরি করুন।" },
      { property: "og:title", content: "অ্যানিমেশন ইঞ্জিন — Master AI Studio" },
      { property: "og:description", content: "ম্যানুয়াল ইঞ্জিন নির্বাচন, স্পেক এডিটর ও Flow প্রম্পট।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnimationPage,
});

const STYLE_SUGGESTIONS = ["2D কার্টুন", "3D কার্টুন", "অ্যানিমে", "পেপার কাটআউট", "ক্লে অ্যানিমেশন", "জলরং", "পিক্সেল আর্ট"];

const CODE_PLACEHOLDER = `# প্রতি লাইনে একটি বিট:  নাম | সময় | কী ঘটবে
দৃশ্য ১ | 4s | জানালার পাশে বিড়াল, বৃষ্টির ফোঁটা পড়ছে
দৃশ্য ২ | 6s | ছাতা খুলে যায়, ক্যামেরা জুম ইন`;

function emptySpec(): AnimationSpec {
  const at = nowIso();
  return {
    id: newId(),
    projectId: null,
    title: "",
    engine: "code_animation",
    visualStyle: "",
    characterIds: [],
    prompt: "",
    codeSpec: "",
    createdAt: at,
    updatedAt: at,
  };
}

function AnimationPage() {
  return (
    <>
      <PageHeader
        icon={Clapperboard}
        title="অ্যানিমেশন ইঞ্জিন"
        description="ইঞ্জিন আপনি নিজে বাছবেন — অ্যাপ কখনও নিজে থেকে ইঞ্জিন বদলায় না।"
      />
      <HydrationGate>
        <AnimationBody />
      </HydrationGate>
    </>
  );
}

function AnimationBody() {
  const list = animations.useAll();
  const projectTitle = useProjectTitle();
  const [editing, setEditing] = useState<AnimationSpec>(() => emptySpec());
  const [key, setKey] = useState(0);
  const open = (s: AnimationSpec) => {
    setEditing(s);
    setKey((k) => k + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <SpecEditor key={key} initial={editing} onSaved={setEditing} onNew={() => open(emptySpec())} />
      <Section title={`সংরক্ষিত স্পেক (${toBnDigits(list.length)})`}>
        {list.length === 0 ? (
          <EmptyState icon={Clapperboard} title="কোনো অ্যানিমেশন স্পেক নেই" description="উপরের এডিটরে স্পেক লিখে সংরক্ষণ করুন।" />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {list.map((s) => (
              <li key={s.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{s.title}</p>
                  <Badge variant={s.engine === "google_flow" ? "teal" : "muted"}>{ENGINE_LABELS[s.engine]}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.visualStyle || "স্টাইল নেই"} · {formatBnDate(s.updatedAt)}
                  {projectTitle(s.projectId) && ` · ${projectTitle(s.projectId)}`}
                </p>
                <div className="mt-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => open(s)}>
                    <Pencil /> এডিট
                  </Button>
                  <ConfirmDelete
                    itemLabel={s.title}
                    onConfirm={() => {
                      safeSave(() => animations.remove(s.id), "স্পেক মুছে ফেলা হয়েছে");
                      if (editing.id === s.id) open(emptySpec());
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

const ENGINES: { id: AnimationEngine; icon: typeof Code2; desc: string }[] = [
  { id: "code_animation", icon: Code2, desc: "স্পেক লিখে ভবিষ্যতে কোড দিয়ে রেন্ডার। এখন স্পেক ও টাইমলাইন প্রিভিউ।" },
  { id: "google_flow", icon: Wand2, desc: "প্রম্পট তৈরি করে Google Flow-এর সাইটে নিজে জেনারেট করুন।" },
];

function SpecEditor({
  initial,
  onSaved,
  onNew,
}: {
  initial: AnimationSpec;
  onSaved: (s: AnimationSpec) => void;
  onNew: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const charList = characters.useAll();
  const exists = animations.get(initial.id) !== undefined;
  const set = <K extends keyof AnimationSpec>(k: K, v: AnimationSpec[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const linkedChars = charList.filter((c) => draft.characterIds.includes(c.id));
  const flowPrompt = buildFlowPrompt(draft, linkedChars);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.title.trim().length < 2) return setError("শিরোনাম কমপক্ষে ২ অক্ষরের দিন।");
    if (draft.engine === "google_flow" && draft.prompt.trim().length < 5)
      return setError("Flow-এর জন্য দৃশ্যের প্রম্পট লিখুন।");
    if (draft.engine === "code_animation" && draft.codeSpec.trim().length < 5)
      return setError("Code Animation-এর জন্য স্পেক লিখুন।");
    setError(null);
    const saved = { ...draft, title: draft.title.trim(), updatedAt: nowIso() };
    if (safeSave(() => animations.upsert(saved), exists ? "স্পেক হালনাগাদ হয়েছে" : "স্পেক সংরক্ষিত হয়েছে")) onSaved(saved);
  }

  return (
    <form onSubmit={submit} noValidate>
      <Section
        title={exists ? "স্পেক সম্পাদনা" : "নতুন অ্যানিমেশন স্পেক"}
        actions={
          exists ? (
            <Button type="button" variant="studio" size="sm" onClick={onNew}>
              <FilePlus2 /> নতুন
            </Button>
          ) : null
        }
      >
        <fieldset className="mb-5">
          <legend className="mb-2 text-sm font-medium text-foreground">ইঞ্জিন বাছুন (ম্যানুয়াল)</legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="অ্যানিমেশন ইঞ্জিন">
            {ENGINES.map((en) => {
              const on = draft.engine === en.id;
              return (
                <button
                  key={en.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("engine", en.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-primary/40",
                  )}
                >
                  <en.icon className={cn("mt-0.5 size-5 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                  <span>
                    <span className="block font-medium text-foreground">{ENGINE_LABELS[en.id]}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{en.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="an-title">শিরোনাম *</Label>
            <Input id="an-title" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="যেমন: বৃষ্টির দৃশ্য" />
          </div>
          <ProjectSelect id="an-project" value={draft.projectId} onChange={(v) => set("projectId", v)} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="an-style">ভিজ্যুয়াল স্টাইল</Label>
            <Input
              id="an-style"
              value={draft.visualStyle}
              onChange={(e) => set("visualStyle", e.target.value)}
              placeholder="যেকোনো কার্টুন/ভিজ্যুয়াল স্টাইল লিখুন"
            />
            <ChipPicker label="স্টাইল সাজেশন" options={STYLE_SUGGESTIONS} value={draft.visualStyle} onPick={(v) => set("visualStyle", v)} />
          </div>
          {charList.length > 0 && (
            <fieldset className="space-y-1.5 sm:col-span-2">
              <legend className="text-sm font-medium text-foreground">চরিত্র</legend>
              <div className="flex flex-wrap gap-1.5">
                {charList.map((c) => {
                  const on = draft.characterIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set("characterIds", on ? draft.characterIds.filter((i) => i !== c.id) : [...draft.characterIds, c.id])
                      }
                      className={cn(
                        "min-h-9 rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on ? "border-teal bg-teal/15 text-teal" : "border-border text-muted-foreground",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-5">
          {draft.engine === "code_animation" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="an-code">প্রম্পট / স্পেক এডিটর</Label>
                <Textarea
                  id="an-code"
                  rows={12}
                  value={draft.codeSpec}
                  onChange={(e) => set("codeSpec", e.target.value)}
                  placeholder={CODE_PLACEHOLDER}
                  className="font-mono text-sm"
                  spellCheck={false}
                />
              </div>
              <CodePreview spec={draft.codeSpec} />
            </div>
          ) : (
            <div className="space-y-4">
              <aside role="note" className="rounded-xl border border-teal/35 bg-teal/[0.07] p-4 text-sm text-muted-foreground">
                জেনারেশন Google Flow-এর নিজের সাইটে হয়, এই অ্যাপের ভেতরে নয়। এখানে প্রম্পট তৈরি করে কপি করুন,
                তারপর Flow-এ পেস্ট করুন। ভবিষ্যতে সমর্থিত ইন্টিগ্রেশন যুক্ত হলে সেটি আলাদাভাবে জানানো হবে।
              </aside>
              <div className="space-y-1.5">
                <Label htmlFor="an-prompt">দৃশ্যের প্রম্পট</Label>
                <Textarea
                  id="an-prompt"
                  rows={5}
                  value={draft.prompt}
                  onChange={(e) => set("prompt", e.target.value)}
                  placeholder="ক্যামেরা, অ্যাকশন, পরিবেশ, আলো — যা দেখাতে চান"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Flow-এর জন্য চূড়ান্ত প্রম্পট</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-sm text-foreground/90">
                  {flowPrompt || "প্রম্পট লিখলে এখানে দেখা যাবে।"}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="studio"
                  disabled={!flowPrompt}
                  onClick={async () => {
                    if (await copyText(flowPrompt)) toast.success("প্রম্পট কপি হয়েছে");
                    else toast.error("কপি করা যায়নি");
                  }}
                >
                  <Copy /> প্রম্পট কপি
                </Button>
                <Button asChild type="button" variant="studio">
                  <a href={GOOGLE_FLOW_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Google Flow খুলুন
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        <FieldError id="an-err" message={error} />
        <div className="mt-4">
          <Button type="submit">
            <Save /> {exists ? "পরিবর্তন সংরক্ষণ" : "স্পেক সংরক্ষণ"}
          </Button>
        </div>
      </Section>
    </form>
  );
}

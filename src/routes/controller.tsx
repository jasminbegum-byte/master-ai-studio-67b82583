import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FilePlus2, Inbox, Loader2, Lock, Send, Workflow, Wand2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { ChipPicker } from "@/components/common/ChipPicker";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { EmptyState } from "@/components/common/EmptyState";
import { FieldError } from "@/components/common/FieldError";
import { HydrationGate } from "@/components/common/HydrationGate";
import { NotConnectedNotice } from "@/components/common/NotConnectedNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { JobPill, StagePill } from "@/components/common/StatusPill";
import { ReviewCheckpoint, StageStatusControl } from "@/components/production/StageControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROVIDER_SLOTS, type ProviderSlotId } from "@/lib/ai/provider-slots";
import { runSpecialistAgent } from "@/lib/ai/providers.functions";
import { useProviderStatus } from "@/lib/ai/use-provider-status";
import {
  buildStagePlan,
  CONTROLLER_DURATIONS,
  createFromBrief,
  DEFAULT_BRIEF_INPUT,
  LIMITS,
  parseDurationInput,
  validateBrief,
  VIDEO_TYPE_SUGGESTIONS,
  type BriefErrors,
  type BriefInput,
  type StagePlanItem,
} from "@/lib/domain/controller";
import { formatBnDate, PLATFORM_LABELS, STAGE_LABELS, toBnDigits } from "@/lib/domain/labels";
import { completedStageCount, deriveJobStatus, PRODUCTION_STAGES } from "@/lib/domain/production";
import { animations, characters, edits, newId, nowIso, projects, scripts, thumbnails } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { Platform, Project } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/controller")({
  validateSearch: (search: Record<string, unknown>): { project?: string } =>
    typeof search["project"] === "string" && search["project"] ? { project: search["project"] } : {},
  head: () => ({
    meta: [
      { title: "মাস্টার কন্ট্রোলার — Master AI Studio" },
      { name: "description", content: "একটি ভিডিও আইডিয়া লিখুন — সাত ধাপের প্রোডাকশন পরিকল্পনা তৈরি ও ট্র্যাক করুন।" },
      { property: "og:title", content: "মাস্টার কন্ট্রোলার — Master AI Studio" },
      { property: "og:description", content: "ভিডিও ব্রিফ থেকে স্ক্রিপ্ট, চরিত্র, অ্যানিমেশন, ভয়েস, এডিটিং, থাম্বনেইল ও রিভিউ পরিকল্পনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ControllerPage,
});

function ControllerPage() {
  return (
    <>
      <PageHeader
        icon={Workflow}
        title="মাস্টার কন্ট্রোলার"
        description="ভিডিওর আইডিয়া দিন — কন্ট্রোলার একটি প্রজেক্ট ও সাত ধাপের কাজের পরিকল্পনা সাজিয়ে দেবে। প্রতিটি ধাপ আপনি নিজে এগিয়ে নেবেন।"
      />
      <div className="mb-5">
        <NotConnectedNotice title="AI কন্ট্রোলার">
          AI প্রোভাইডার যুক্ত না থাকায় কন্ট্রোলার এখন শুধু নিয়মভিত্তিক পরিকল্পনা ও সঠিক পেজে পাঠানোর কাজ করছে। কোনো
          স্ক্রিপ্ট, ভিডিও, ভয়েস বা থাম্বনেইল তৈরি হয়নি, এবং কিছুই স্বয়ংক্রিয়ভাবে প্রকাশ হবে না।
        </NotConnectedNotice>
      </div>
      <HydrationGate rows={4}>
        <ControllerBody />
      </HydrationGate>
    </>
  );
}

function ControllerBody() {
  const { project: selectedId } = Route.useSearch();
  const list = projects.useAll();
  const briefed = [...list].filter((p) => p.brief).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selected = selectedId ? list.find((p) => p.id === selectedId) : undefined;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        {selected ? (
          <PlanView key={selected.id} project={selected} />
        ) : selectedId ? (
          <EmptyState
            icon={Inbox}
            title="ব্রিফটি পাওয়া যায়নি"
            description="এটি হয়তো মুছে ফেলা হয়েছে। নতুন একটি ব্রিফ দিন।"
            action={
              <Button asChild variant="studio">
                <Link to="/controller" search={{}}>
                  <FilePlus2 /> নতুন ব্রিফ
                </Link>
              </Button>
            }
          />
        ) : (
          <BriefForm />
        )}
      </div>
      <SavedBriefs list={briefed} selectedId={selectedId} />
    </div>
  );
}

/* ---------------- Brief form ---------------- */

function BriefForm() {
  const navigate = Route.useNavigate();
  const [input, setInput] = useState<BriefInput>(DEFAULT_BRIEF_INPUT);
  const [durationText, setDurationText] = useState(toBnDigits(DEFAULT_BRIEF_INPUT.targetDurationSec));
  const [errors, setErrors] = useState<BriefErrors>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof BriefInput>(k: K, v: BriefInput[K]) => setInput((d) => ({ ...d, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...input, targetDurationSec: parseDurationInput(durationText) };
    const errs = validateBrief(next);
    setErrors(errs);
    if (Object.keys(errs).length) {
      // Move focus to the first invalid field so keyboard and screen-reader users land on the problem.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setSaving(true);
    const at = nowIso();
    const { project, script } = createFromBrief(next, at, { projectId: newId(), scriptId: newId() });
    const ok = safeSave(() => {
      projects.upsert(project);
      if (script) scripts.upsert(script);
    }, "ব্রিফ ও কাজের পরিকল্পনা সংরক্ষিত হয়েছে");
    setSaving(false);
    if (!ok) return;
    navigate({ to: "/controller", search: { project: project.id } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Section title="নতুন প্রোডাকশন ব্রিফ" description="তারকা (*) চিহ্নিত ঘর পূরণ করা আবশ্যক।">
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="br-instruction">ভিডিওর আইডিয়া / নির্দেশ *</Label>
          <Textarea
            id="br-instruction"
            rows={5}
            maxLength={LIMITS.instruction + 50}
            value={input.instruction}
            onChange={(e) => set("instruction", e.target.value)}
            aria-invalid={Boolean(errors.instruction)}
            aria-describedby="br-instruction-hint br-instruction-err"
            placeholder="যেমন: এক ছোট ছেলে বৃষ্টির দিনে একটি হারানো কুকুরছানা খুঁজে পায় এবং তাকে বাড়ি ফিরিয়ে দেয়…"
          />
          <p id="br-instruction-hint" className="text-xs text-muted-foreground">
            {toBnDigits(input.instruction.trim().length)}/{toBnDigits(LIMITS.instruction)} অক্ষর
          </p>
          <FieldError id="br-instruction-err" message={errors.instruction} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="br-title">প্রজেক্টের নাম (ঐচ্ছিক)</Label>
          <Input
            id="br-title"
            value={input.title}
            maxLength={LIMITS.title + 10}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby="br-title-hint br-title-err"
            placeholder="খালি রাখলে আইডিয়ার প্রথম লাইন থেকে নাম হবে"
          />
          <p id="br-title-hint" className="sr-only">খালি রাখলে আইডিয়ার প্রথম লাইন থেকে নাম নেওয়া হবে।</p>
          <FieldError id="br-title-err" message={errors.title} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="br-platform">প্ল্যাটফর্ম</Label>
            <Select value={input.platform} onValueChange={(v) => set("platform", v as Platform)}>
              <SelectTrigger id="br-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="br-duration">দৈর্ঘ্য (সেকেন্ড) *</Label>
            <Input
              id="br-duration"
              inputMode="numeric"
              value={durationText}
              onChange={(e) => setDurationText(e.target.value)}
              aria-invalid={Boolean(errors.targetDurationSec)}
              aria-describedby="br-duration-err"
            />
            <ChipPicker
              label="দ্রুত দৈর্ঘ্য বাছুন"
              options={CONTROLLER_DURATIONS.map((d) => toBnDigits(d))}
              value={durationText}
              onPick={setDurationText}
            />
            <FieldError id="br-duration-err" message={errors.targetDurationSec} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="br-type">ভিডিওর ধরন *</Label>
          <Input
            id="br-type"
            value={input.videoType}
            maxLength={60}
            onChange={(e) => set("videoType", e.target.value)}
            aria-invalid={Boolean(errors.videoType)}
            aria-describedby="br-type-err"
            placeholder="যেমন: কার্টুন গল্প"
          />
          <ChipPicker
            label="ভিডিওর ধরনের পরামর্শ"
            options={VIDEO_TYPE_SUGGESTIONS}
            value={input.videoType}
            onPick={(v) => set("videoType", v)}
          />
          <FieldError id="br-type-err" message={errors.videoType} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="br-extra">অতিরিক্ত নির্দেশ (ঐচ্ছিক)</Label>
          <Textarea
            id="br-extra"
            rows={3}
            maxLength={LIMITS.extra + 50}
            value={input.extraInstructions}
            onChange={(e) => set("extraInstructions", e.target.value)}
            aria-invalid={Boolean(errors.extraInstructions)}
            aria-describedby="br-extra-err"
            placeholder="যেমন: শেষে একটি শিক্ষণীয় বার্তা থাকবে, রং উজ্জ্বল হবে"
          />
          <FieldError id="br-extra-err" message={errors.extraInstructions} />
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
          <Checkbox
            id="br-script"
            checked={input.createScriptDraft}
            onCheckedChange={(v) => set("createScriptDraft", v === true)}
            className="mt-1"
          />
          <Label htmlFor="br-script" className="text-sm leading-relaxed">
            এই আইডিয়া দিয়ে একটি খালি স্ক্রিপ্ট খসড়াও খুলুন (দৃশ্যগুলো আপনি নিজে লিখবেন)
          </Label>
        </div>

        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm text-destructive">
            কিছু ঘরে সমস্যা আছে — লাল লেখা দেখে ঠিক করুন।
          </p>
        )}

        <Button type="submit" variant="hero" disabled={saving} className="w-full sm:w-auto">
          <Send /> {saving ? "সংরক্ষণ হচ্ছে…" : "পরিকল্পনা তৈরি করুন"}
        </Button>
      </form>
    </Section>
  );
}

/* ---------------- Saved briefs ---------------- */

function SavedBriefs({ list, selectedId }: { list: Project[]; selectedId: string | undefined }) {
  return (
    <Section
      title={`সংরক্ষিত ব্রিফ (${toBnDigits(list.length)})`}
      className="h-fit"
      actions={
        selectedId ? (
          <Button asChild variant="studio" size="sm">
            <Link to="/controller" search={{}}>
              <FilePlus2 /> নতুন ব্রিফ
            </Link>
          </Button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          এখনও কোনো ব্রিফ নেই। ফর্মে আইডিয়া লিখে প্রথম পরিকল্পনা তৈরি করুন।
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                to="/controller"
                search={{ project: p.id }}
                aria-current={p.id === selectedId ? "true" : undefined}
                className={cn(
                  "block rounded-lg border bg-surface p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  p.id === selectedId ? "border-primary/60" : "border-border hover:border-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-medium text-foreground">{p.title}</p>
                  <JobPill status={deriveJobStatus(p)} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {toBnDigits(completedStageCount(p))}/{toBnDigits(PRODUCTION_STAGES.length)} ধাপ সম্পন্ন ·{" "}
                  {formatBnDate(p.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ---------------- Plan view ---------------- */

function PlanView({ project }: { project: Project }) {
  const navigate = Route.useNavigate();
  const scriptList = scripts.useAll().filter((s) => s.projectId === project.id);
  const charList = characters.useAll();
  const animationCount = animations.useAll().filter((a) => a.projectId === project.id).length;
  const editCount = edits.useAll().filter((e) => e.projectId === project.id).length;
  const thumbnailCount = thumbnails.useAll().filter((t) => t.projectId === project.id).length;
  const linkedCharIds = new Set(scriptList.flatMap((s) => s.characterIds));
  const characterNames = charList.filter((c) => linkedCharIds.has(c.id)).map((c) => c.name);

  const plan = buildStagePlan(project, { scripts: scriptList, characterNames, animationCount, editCount, thumbnailCount });
  const brief = project.brief;
  const providerStatus = useProviderStatus();
  const textConfigured = providerStatus.data?.find((item) => item.id === "text")?.configured === true;
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPlan, setAiPlan] = useState("");
  const [aiError, setAiError] = useState("");

  async function generateAiPlan() {
    if (!brief || aiBusy) return;
    setAiBusy(true);
    setAiError("");
    setAiPlan("");
    try {
      const result = await runSpecialistAgent({
        data: {
          agentId: "master",
          mode: "automatic",
          instruction: "এই প্রোডাকশন ব্রিফকে বাস্তবসম্মতভাবে বিশেষজ্ঞ এজেন্টদের আলাদা কাজে ভাগ করো। প্রতিটি কাজের জন্য এজেন্ট, deliverable, প্রয়োজনীয় input, dependency, review checkpoint এবং পরবর্তী ধাপ দাও। যেসব মিডিয়া-জেনারেশন সংযোগ নেই, সেগুলোকে pending external integration হিসেবে দেখাও।\nপ্রজেক্ট: " + project.title + "\nমূল নির্দেশ: " + brief.instruction + "\nভিডিওর ধরন: " + brief.videoType + "\nপ্ল্যাটফর্ম: " + PLATFORM_LABELS[project.platform] + "\nদৈর্ঘ্য: " + brief.targetDurationSec + " সেকেন্ড\nঅতিরিক্ত নির্দেশ: " + (brief.extraInstructions || "নেই"),
          context: "বর্তমান প্রোডাকশন স্ট্যাটাস: " + PRODUCTION_STAGES.map((stage) => STAGE_LABELS[stage] + ": " + project.stages[stage].status).join("; "),
        },
      });
      if (result.ok) setAiPlan(result.reply);
      else setAiError(result.message);
    } catch {
      setAiError("AI পরিকল্পনা তৈরি করা যায়নি। সংযোগ পরীক্ষা করুন।");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/controller" search={{}}>
          <ArrowLeft /> নতুন ব্রিফ
        </Link>
      </Button>

      <Section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-foreground">{project.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {PLATFORM_LABELS[project.platform]}
              {brief && ` · ${brief.videoType} · ${toBnDigits(brief.targetDurationSec)} সেকেন্ড`} · তৈরি{" "}
              {formatBnDate(project.createdAt)}
            </p>
          </div>
          <JobPill status={deriveJobStatus(project)} className="text-sm" />
        </div>
        {brief ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">আপনার নির্দেশ</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-foreground/90">{brief.instruction}</dd>
            </div>
            {brief.extraInstructions && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">অতিরিক্ত নির্দেশ</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-foreground/90">{brief.extraInstructions}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">এই প্রজেক্টটি কন্ট্রোলার থেকে তৈরি হয়নি, তাই কোনো ব্রিফ নেই।</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="studio" size="sm">
            <Link to="/monitor" search={{ project: project.id }}>
              প্রোডাকশন মনিটরে খুলুন <ArrowRight />
            </Link>
          </Button>
          <ConfirmDelete
            itemLabel={project.title}
            description="ব্রিফ, প্রজেক্ট ও তার ধাপের তথ্য মুছে যাবে। যুক্ত স্ক্রিপ্ট খসড়া স্ক্রিপ্ট এজেন্টে থেকে যাবে।"
            onConfirm={() => {
              if (safeSave(() => projects.remove(project.id), "ব্রিফ মুছে ফেলা হয়েছে")) {
                navigate({ to: "/controller", search: {} });
              }
            }}
          />
        </div>
      </Section>

      <Section title="AI-চালিত মাস্টার পরিকল্পনা" description="সংরক্ষিত ব্রিফ ও বর্তমান স্ট্যাটাস দেখে AI এজেন্টদের কাজ ভাগ করে বিস্তারিত পরিকল্পনা তৈরি করবে।">
        <Button type="button" onClick={generateAiPlan} disabled={!textConfigured || !brief || aiBusy}>
          {aiBusy ? <Loader2 className="animate-spin" /> : <Wand2 />} {aiBusy ? "পরিকল্পনা তৈরি হচ্ছে…" : "AI দিয়ে কাজ ভাগ করো"}
        </Button>
        {aiError && <p role="alert" className="mt-3 text-sm text-destructive">{aiError}</p>}
        {aiPlan && <Textarea className="mt-3 min-h-72" value={aiPlan} readOnly aria-label="AI মাস্টার পরিকল্পনা" />}
        <p className="mt-2 text-xs text-muted-foreground">AI পরিকল্পনা তৈরি হলেই কোনো কাজ স্বয়ংক্রিয়ভাবে সম্পন্ন হয় না। প্রতিটি মিডিয়া আউটপুট আলাদাভাবে তৈরি ও পর্যালোচনা করতে হবে।</p>
      </Section>

      <section aria-labelledby="plan-heading" className="space-y-3">
        <div>
          <h2 id="plan-heading" className="text-lg font-semibold text-foreground">
            কাজের পরিকল্পনা — {toBnDigits(plan.length)}টি ধাপ
          </h2>
          <p className="text-sm text-muted-foreground">
            স্ট্যাটাস আপনি নিজে বদলান; কন্ট্রোলার নিজে কোনো ধাপ সম্পন্ন ধরে নেয় না।
          </p>
        </div>
        <ol className="space-y-3">
          {plan.map((item, i) => (
            <PlanStage key={item.stage} project={project} item={item} index={i} />
          ))}
        </ol>
      </section>

      <ReviewCheckpoint project={project} idPrefix="ctl" />

      <Section title="প্রকাশ (Publishing)">
        <div className="flex items-start gap-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            কন্ট্রোলার কখনও স্বয়ংক্রিয়ভাবে প্রকাশ করে না। প্রকাশ সংযোগ যুক্ত নেই; ভবিষ্যতে যুক্ত হলেও চূড়ান্ত অনুমোদনের পরে
            প্রতিবার আলাদা স্পষ্ট নিশ্চিতকরণ লাগবে।
          </p>
        </div>
      </Section>
    </div>
  );
}

function ProviderBadge({ slot }: { slot: ProviderSlotId | null }) {
  const status = useProviderStatus();
  if (!slot) return <Badge variant="muted">হাতে করা ধাপ</Badge>;
  const title = PROVIDER_SLOTS.find((p) => p.id === slot)?.title ?? slot;
  if (status.isPending) return <Badge variant="muted">{title}: যাচাই হচ্ছে…</Badge>;
  if (status.isError) return <Badge variant="warning">{title}: অবস্থা জানা যায়নি</Badge>;
  const on = status.data?.find((s) => s.id === slot)?.configured;
  return <Badge variant={on ? "teal" : "warning"}>{title}: {on ? "সংযুক্ত" : "সংযুক্ত নয়"}</Badge>;
}

function PlanStage({ project, item, index }: { project: Project; item: StagePlanItem; index: number }) {
  const isReview = item.stage === "review";
  const headingId = `plan-stage-${item.stage}`;
  return (
    <li aria-labelledby={headingId} className="studio-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-display text-sm text-muted-foreground"
          >
            {toBnDigits(index + 1)}
          </span>
          <h3 id={headingId} className="font-semibold text-foreground">
            {STAGE_LABELS[item.stage]}
          </h3>
        </div>
        <StagePill status={project.stages[item.stage].status} />
      </div>

      <p className="mt-3 text-sm text-foreground/90">{item.purpose}</p>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">প্রয়োজনীয় ইনপুট</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground/85">
            {item.inputs.map((x) => (
              <li key={x} className="break-words">
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">পরবর্তী কাজ</p>
          <p className="mt-1 text-foreground/85">{item.nextAction}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ProviderBadge slot={item.providerSlot} />
      </div>

      {!isReview && (
        <div className="mt-3">
          <StageStatusControl project={project} stage={item.stage} idPrefix="ctl" />
        </div>
      )}

      <div className="mt-3">
        {isReview ? (
          <p className="text-xs text-muted-foreground">অনুমোদনের ফর্ম নিচে আছে।</p>
        ) : item.link.scriptId ? (
          <Button asChild variant="studio" size="sm">
            <Link to="/script" search={{ id: item.link.scriptId }}>
              {item.link.label} <ArrowRight />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="studio" size="sm">
            <Link to={item.link.to}>
              {item.link.label} <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}

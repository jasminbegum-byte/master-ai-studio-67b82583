import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeft, Download, FolderOpen, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { EmptyState } from "@/components/common/EmptyState";
import { HydrationGate } from "@/components/common/HydrationGate";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { JobPill, StagePill } from "@/components/common/StatusPill";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { downloadJson, safeFilename } from "@/lib/download";
import {
  formatBnDate,
  PLATFORM_LABELS,
  STAGE_LABELS,
  STAGE_STATUS_LABELS,
  toBnDigits,
} from "@/lib/domain/labels";
import {
  approveProject,
  canApprove,
  completedStageCount,
  deriveJobStatus,
  JOB_STATUS_LABELS,
  PRODUCTION_STAGES,
  revokeApproval,
  STAGE_STATUSES,
  updateStage,
  type JobStatus,
} from "@/lib/domain/production";
import {
  animations,
  edits,
  nowIso,
  projects,
  scripts,
  thumbnails,
} from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { Project, StageKey, StageStatus } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitor")({
  validateSearch: (search: Record<string, unknown>): { project?: string } =>
    typeof search["project"] === "string" && search["project"] ? { project: search["project"] } : {},
  head: () => ({
    meta: [
      { title: "প্রোডাকশন মনিটর — Master AI Studio" },
      { name: "description", content: "প্রতিটি প্রজেক্টের স্টেজ, অবস্থা ও চূড়ান্ত অনুমোদন ট্র্যাক করুন।" },
      { property: "og:title", content: "প্রোডাকশন মনিটর — Master AI Studio" },
      { property: "og:description", content: "সংরক্ষিত জব, স্টেজ স্ট্যাটাস ও রিভিউ চেকপয়েন্ট।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MonitorPage,
});

type Filter = "all" | JobStatus;
const FILTERS: Filter[] = ["all", "draft", "waiting_connection", "ready_review", "approved", "failed"];

function MonitorPage() {
  return (
    <>
      <PageHeader
        icon={Activity}
        title="প্রোডাকশন মনিটর"
        description="স্ট্যাটাস আপনি নিজে হালনাগাদ করেন — কোনো স্বয়ংক্রিয় বা বানানো অগ্রগতি দেখানো হয় না।"
        actions={<CreateProjectDialog triggerVariant="studio" />}
      />
      <HydrationGate rows={4}>
        <MonitorBody />
      </HydrationGate>
    </>
  );
}

function MonitorBody() {
  const { project: selectedId } = Route.useSearch();
  const list = projects.useAll();
  const [filter, setFilter] = useState<Filter>("all");
  const selected = selectedId ? list.find((p) => p.id === selectedId) : undefined;

  if (list.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="কোনো জব নেই"
        description="প্রজেক্ট তৈরি করলে এখানে তার প্রতিটি স্টেজ ট্র্যাক করতে পারবেন।"
        action={<CreateProjectDialog />}
      />
    );
  }

  const sorted = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const filtered = filter === "all" ? sorted : sorted.filter((p) => deriveJobStatus(p) === filter);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className={cn("min-w-0 space-y-3", selected && "hidden lg:block")}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="স্ট্যাটাস ফিল্টার">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "সব" : JOB_STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            এই স্ট্যাটাসে কোনো জব নেই।
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  to="/monitor"
                  search={{ project: p.id }}
                  aria-current={p.id === selectedId ? "true" : undefined}
                  className={cn(
                    "studio-card block p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    p.id === selectedId ? "border-primary/60" : "hover:border-primary/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <JobPill status={deriveJobStatus(p)} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toBnDigits(completedStageCount(p))}/{toBnDigits(PRODUCTION_STAGES.length)} স্টেজ সম্পন্ন ·{" "}
                    {formatBnDate(p.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn(!selected && "hidden lg:block")}>
        {selected ? (
          <ProjectDetail key={selected.id} project={selected} />
        ) : (
          <EmptyState
            icon={Activity}
            title={selectedId ? "প্রজেক্টটি পাওয়া যায়নি" : "একটি প্রজেক্ট বেছে নিন"}
            description={
              selectedId
                ? "এটি হয়তো মুছে ফেলা হয়েছে।"
                : "বাম দিকের তালিকা থেকে প্রজেক্ট বেছে নিয়ে স্টেজ হালনাগাদ করুন।"
            }
          />
        )}
      </div>
    </div>
  );
}

function save(next: Project, message?: string) {
  return safeSave(() => projects.upsert(next), message);
}

function ProjectDetail({ project }: { project: Project }) {
  const navigate = Route.useNavigate();
  const status = deriveJobStatus(project);
  const scriptList = scripts.useAll().filter((s) => s.projectId === project.id);
  const animList = animations.useAll().filter((a) => a.projectId === project.id);
  const editList = edits.useAll().filter((e) => e.projectId === project.id);
  const thumbList = thumbnails.useAll().filter((t) => t.projectId === project.id);

  const linkedCounts: Partial<Record<StageKey, number>> = {
    script: scriptList.length,
    animation: animList.length,
    editing: editList.length,
    thumbnail: thumbList.length,
  };

  function exportProject() {
    downloadJson(
      { project, scripts: scriptList, animations: animList, edits: editList, thumbnails: thumbList, exportedAt: nowIso() },
      `${safeFilename(project.title)}.json`,
    );
  }

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="lg:hidden">
        <Link to="/monitor">
          <ArrowLeft /> সব প্রজেক্ট
        </Link>
      </Button>

      <Section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{project.title}</h2>
              {project.isExample && <Badge variant="teal">উদাহরণ</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {PLATFORM_LABELS[project.platform]} · তৈরি {formatBnDate(project.createdAt)}
            </p>
            {project.description && <p className="mt-2 text-sm text-foreground/85">{project.description}</p>}
          </div>
          <JobPill status={status} className="text-sm" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="studio" size="sm" onClick={exportProject}>
            <Download /> JSON এক্সপোর্ট
          </Button>
          <ConfirmDelete
            itemLabel={project.title}
            description="প্রজেক্ট ও তার স্টেজ তথ্য মুছে যাবে। যুক্ত স্ক্রিপ্ট/ব্রিফগুলো আলাদাভাবে থেকে যাবে।"
            onConfirm={() => {
              if (safeSave(() => projects.remove(project.id), "প্রজেক্ট মুছে ফেলা হয়েছে")) {
                navigate({ to: "/monitor", search: {} });
              }
            }}
          />
        </div>
      </Section>

      <Section title="স্টেজ ট্র্যাকিং" description="প্রতিটি স্টেজের অবস্থা ও নোট নিজে হালনাগাদ করুন।">
        <ul className="space-y-3">
          {PRODUCTION_STAGES.map((stage) => (
            <StageRow key={stage} project={project} stage={stage} linkedCount={linkedCounts[stage]} />
          ))}
        </ul>
      </Section>

      <ReviewCheckpoint project={project} />

      <Section title="প্রকাশ (Publishing)">
        <div className="flex items-start gap-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            এই অ্যাপ স্বয়ংক্রিয়ভাবে Facebook বা অন্য কোথাও প্রকাশ করে না। প্রকাশ সংযোগ এখনও যুক্ত নেই।
            ভবিষ্যতে যুক্ত হলেও চূড়ান্ত অনুমোদনের পরে প্রতিবার আলাদা স্পষ্ট নিশ্চিতকরণ ছাড়া কিছুই প্রকাশ হবে না।
          </p>
        </div>
      </Section>
    </div>
  );
}

function StageRow({
  project,
  stage,
  linkedCount,
}: {
  project: Project;
  stage: StageKey;
  linkedCount?: number | undefined;
}) {
  const state = project.stages[stage];
  const [note, setNote] = useState(state.note);
  useEffect(() => setNote(state.note), [state.note]);

  function setStatus(status: StageStatus) {
    const wasApproved = project.approval.approved;
    const next = updateStage(project, stage, { status }, nowIso());
    if (save(next) && wasApproved && !next.approval.approved) {
      toast.warning("স্টেজ বদলানোয় চূড়ান্ত অনুমোদন বাতিল হয়েছে", {
        description: "আবার রিভিউ করে অনুমোদন দিন।",
      });
    }
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{STAGE_LABELS[stage]}</p>
          {linkedCount !== undefined && (
            <span className="text-xs text-muted-foreground">({toBnDigits(linkedCount)}টি যুক্ত আইটেম)</span>
          )}
        </div>
        <StagePill status={state.status} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[13rem_1fr]">
        <div>
          <Label htmlFor={`st-${stage}`} className="sr-only">
            {STAGE_LABELS[stage]} স্ট্যাটাস
          </Label>
          <Select value={state.status} onValueChange={(v) => setStatus(v as StageStatus)}>
            <SelectTrigger id={`st-${stage}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`note-${stage}`} className="sr-only">
            {STAGE_LABELS[stage]} নোট
          </Label>
          <Input
            id={`note-${stage}`}
            value={note}
            placeholder="নোট (যেমন: Flow-এ রেন্ডার বাকি)"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note !== state.note) save(updateStage(project, stage, { note }, nowIso()), "নোট সংরক্ষিত");
            }}
          />
        </div>
      </div>
    </li>
  );
}

function ReviewCheckpoint({ project }: { project: Project }) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState(project.approval.note);
  const allowed = canApprove(project);
  const remaining = PRODUCTION_STAGES.filter((s) => project.stages[s].status !== "done");
  const failed = PRODUCTION_STAGES.filter((s) => project.stages[s].status === "failed");

  if (project.approval.approved) {
    return (
      <Section title="চূড়ান্ত রিভিউ ও অনুমোদন" className="border-status-done/40">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-status-done" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              আপনি অনুমোদন দিয়েছেন — {project.approval.approvedAt ? formatBnDate(project.approval.approvedAt) : ""}
            </p>
            {project.approval.note && <p className="mt-1 text-muted-foreground">নোট: {project.approval.note}</p>}
            <p className="mt-1 text-muted-foreground">অনুমোদন মানে প্রকাশ নয়; প্রকাশের জন্য আলাদা নিশ্চিতকরণ লাগবে।</p>
          </div>
        </div>
        <Button
          variant="studio"
          size="sm"
          className="mt-4"
          onClick={() => save(revokeApproval(project, nowIso()), "অনুমোদন প্রত্যাহার করা হয়েছে")}
        >
          অনুমোদন প্রত্যাহার
        </Button>
      </Section>
    );
  }

  return (
    <Section
      title="চূড়ান্ত রিভিউ ও অনুমোদন"
      description="সব প্রোডাকশন স্টেজ ‘সম্পন্ন’ হলে তবেই অনুমোদন দেওয়া যাবে।"
    >
      {!allowed ? (
        <p className="text-sm text-muted-foreground">
          {failed.length > 0
            ? `ব্যর্থ স্টেজ ঠিক করুন: ${failed.map((s) => STAGE_LABELS[s]).join(", ")}`
            : `বাকি স্টেজ: ${remaining.map((s) => STAGE_LABELS[s]).join(", ")}`}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirmed) return;
            save(approveProject(project, note.trim(), nowIso()), "চূড়ান্ত অনুমোদন দেওয়া হয়েছে");
          }}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="review-confirm"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-1"
            />
            <Label htmlFor="review-confirm" className="text-sm leading-relaxed">
              আমি স্ক্রিপ্ট, চরিত্র, অ্যানিমেশন, এডিটিং ও থাম্বনেইল নিজে দেখে নিশ্চিত হয়েছি।
            </Label>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="রিভিউ নোট (ঐচ্ছিক)"
            aria-label="রিভিউ নোট"
          />
          <Button type="submit" disabled={!confirmed}>
            <ShieldCheck /> চূড়ান্ত অনুমোদন দিন
          </Button>
        </form>
      )}
    </Section>
  );
}

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatBnDate, STAGE_LABELS, STAGE_STATUS_LABELS } from "@/lib/domain/labels";
import {
  approveProject,
  canApprove,
  PRODUCTION_STAGES,
  revokeApproval,
  STAGE_STATUSES,
  updateStage,
} from "@/lib/domain/production";
import { nowIso, projects } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { Project, StageKey, StageStatus } from "@/lib/store/types";

/** Shared by Production Monitor and Master Controller so both pages follow identical stage rules. */
export function saveProject(next: Project, message?: string) {
  return safeSave(() => projects.upsert(next), message);
}

/** Manual status select + note for one production stage. */
export function StageStatusControl({ project, stage, idPrefix }: { project: Project; stage: StageKey; idPrefix: string }) {
  const state = project.stages[stage];
  const [note, setNote] = useState(state.note);
  useEffect(() => setNote(state.note), [state.note]);

  function setStatus(status: StageStatus) {
    const wasApproved = project.approval.approved;
    const next = updateStage(project, stage, { status }, nowIso());
    if (saveProject(next, "স্ট্যাটাস হালনাগাদ হয়েছে") && wasApproved && !next.approval.approved) {
      toast.warning("স্টেজ বদলানোয় চূড়ান্ত অনুমোদন বাতিল হয়েছে", {
        description: "আবার রিভিউ করে অনুমোদন দিন।",
      });
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[13rem_1fr]">
      <div>
        <Label htmlFor={`${idPrefix}-st-${stage}`} className="sr-only">
          {STAGE_LABELS[stage]} স্ট্যাটাস
        </Label>
        <Select value={state.status} onValueChange={(v) => setStatus(v as StageStatus)}>
          <SelectTrigger id={`${idPrefix}-st-${stage}`}>
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
        <Label htmlFor={`${idPrefix}-note-${stage}`} className="sr-only">
          {STAGE_LABELS[stage]} নোট
        </Label>
        <Input
          id={`${idPrefix}-note-${stage}`}
          value={note}
          maxLength={300}
          placeholder="নোট (যেমন: Flow-এ রেন্ডার বাকি)"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note !== state.note) saveProject(updateStage(project, stage, { note }, nowIso()), "নোট সংরক্ষিত");
          }}
        />
      </div>
    </div>
  );
}

/** Final human checkpoint. Approval needs every production stage done plus an explicit tick. Never publishes. */
export function ReviewCheckpoint({ project, idPrefix }: { project: Project; idPrefix: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState(project.approval.note);
  const allowed = canApprove(project);
  const remaining = PRODUCTION_STAGES.filter((s) => project.stages[s].status !== "done");
  const failed = PRODUCTION_STAGES.filter((s) => project.stages[s].status === "failed");
  const confirmId = `${idPrefix}-review-confirm`;

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
          onClick={() => saveProject(revokeApproval(project, nowIso()), "অনুমোদন প্রত্যাহার করা হয়েছে")}
        >
          অনুমোদন প্রত্যাহার
        </Button>
      </Section>
    );
  }

  return (
    <Section title="চূড়ান্ত রিভিউ ও অনুমোদন" description="সব প্রোডাকশন স্টেজ ‘সম্পন্ন’ হলে তবেই অনুমোদন দেওয়া যাবে।">
      {!allowed ? (
        <p className="text-sm text-muted-foreground" role="status">
          {failed.length > 0
            ? `ব্যর্থ স্টেজ ঠিক করুন: ${failed.map((s) => STAGE_LABELS[s]).join(", ")}`
            : `বাকি স্টেজ: ${remaining.map((s) => STAGE_LABELS[s]).join(", ")}`}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirmed || !canApprove(project)) return;
            saveProject(approveProject(project, note.trim(), nowIso()), "চূড়ান্ত অনুমোদন দেওয়া হয়েছে");
          }}
        >
          <div className="flex items-start gap-3">
            <Checkbox id={confirmId} checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-1" />
            <Label htmlFor={confirmId} className="text-sm leading-relaxed">
              আমি স্ক্রিপ্ট, চরিত্র, অ্যানিমেশন, ভয়েস, এডিটিং ও থাম্বনেইল নিজে দেখে নিশ্চিত হয়েছি।
            </Label>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
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

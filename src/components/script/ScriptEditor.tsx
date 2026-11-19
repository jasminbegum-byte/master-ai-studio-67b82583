import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ChipPicker } from "@/components/common/ChipPicker";
import { FieldError } from "@/components/common/FieldError";
import { ProjectSelect } from "@/components/common/ProjectSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGE_LABELS, PLATFORM_LABELS, toBnDigits } from "@/lib/domain/labels";
import { totalSceneDuration } from "@/lib/domain/prompts";
import { characters, newId, nowIso, scripts } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { Platform, Scene, Script, ScriptLanguage } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60, 90];
const STYLE_SUGGESTIONS = ["মজার কার্টুন", "আবেগঘন গল্প", "রহস্য / থ্রিলার", "ভৌতিক", "শিক্ষামূলক", "অনুপ্রেরণামূলক"];

export function emptyScript(): Script {
  const at = nowIso();
  return {
    id: newId(),
    projectId: null,
    title: "",
    idea: "",
    platform: "facebook_reels",
    targetDurationSec: 30,
    language: "bn",
    style: "",
    characterIds: [],
    scenes: [],
    isExample: false,
    createdAt: at,
    updatedAt: at,
  };
}

type Errors = Partial<Record<"title" | "idea" | "scenes", string>>;

function validate(s: Script): Errors {
  const e: Errors = {};
  if (s.title.trim().length < 2) e.title = "শিরোনাম কমপক্ষে ২ অক্ষরের দিন।";
  if (s.idea.trim().length < 10) e.idea = "গল্প/আইডিয়া কমপক্ষে ১০ অক্ষরে লিখুন।";
  if (s.scenes.some((sc) => !sc.visual.trim() && !sc.narration.trim()))
    e.scenes = "খালি দৃশ্য মুছে ফেলুন অথবা দৃশ্য/সংলাপ লিখুন।";
  else if (s.scenes.some((sc) => !(sc.durationSec > 0)))
    e.scenes = "প্রতিটি দৃশ্যের সময় ০-এর বেশি সেকেন্ড দিন।";
  return e;
}

export function ScriptEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial: Script;
  onSaved: (s: Script) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [draft, setDraft] = useState<Script>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const charList = characters.useAll();
  const isExisting = scripts.get(initial.id) !== undefined;

  const set = <K extends keyof Script>(k: K, v: Script[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setScene = (id: string, patch: Partial<Scene>) =>
    set("scenes", draft.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const moveScene = (index: number, dir: -1 | 1) => {
    const next = [...draft.scenes];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + dir, 0, item);
    set("scenes", next);
  };

  const total = totalSceneDuration(draft);
  const mismatch =
    draft.scenes.length > 0 && Math.abs(total - draft.targetDurationSec) > draft.targetDurationSec * 0.2;

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const saved = { ...draft, title: draft.title.trim(), updatedAt: nowIso() };
    if (safeSave(() => scripts.upsert(saved), isExisting ? "স্ক্রিপ্ট হালনাগাদ হয়েছে" : "স্ক্রিপ্ট সংরক্ষিত হয়েছে")) {
      onSaved(saved);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-title">শিরোনাম *</Label>
          <Input
            id="sc-title"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby="sc-title-err"
            placeholder="যেমন: দাদুর জাদুর বাক্স"
          />
          <FieldError id="sc-title-err" message={errors.title} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-idea">গল্প / আইডিয়া (বাংলায়) *</Label>
          <Textarea
            id="sc-idea"
            rows={5}
            value={draft.idea}
            onChange={(e) => set("idea", e.target.value)}
            aria-invalid={Boolean(errors.idea)}
            aria-describedby="sc-idea-err"
            placeholder="আপনার গল্পের মূল ভাবনা লিখুন…"
          />
          <FieldError id="sc-idea-err" message={errors.idea} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-platform">টার্গেট প্ল্যাটফর্ম</Label>
          <Select value={draft.platform} onValueChange={(v) => set("platform", v as Platform)}>
            <SelectTrigger id="sc-platform">
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
          <Label htmlFor="sc-duration">সময়সীমা</Label>
          <Select
            value={String(draft.targetDurationSec)}
            onValueChange={(v) => set("targetDurationSec", Number(v))}
          >
            <SelectTrigger id="sc-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {toBnDigits(d)} সেকেন্ড
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-lang">ভাষা</Label>
          <Select value={draft.language} onValueChange={(v) => set("language", v as ScriptLanguage)}>
            <SelectTrigger id="sc-lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LANGUAGE_LABELS) as ScriptLanguage[]).map((l) => (
                <SelectItem key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ProjectSelect id="sc-project" value={draft.projectId} onChange={(v) => set("projectId", v)} />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sc-style">স্টাইল</Label>
          <Input
            id="sc-style"
            value={draft.style}
            onChange={(e) => set("style", e.target.value)}
            placeholder="নিজের মতো লিখুন বা নিচ থেকে বাছুন"
          />
          <ChipPicker label="স্টাইল সাজেশন" options={STYLE_SUGGESTIONS} value={draft.style} onPick={(v) => set("style", v)} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">চরিত্র যুক্ত করুন</legend>
        {charList.length === 0 ? (
          <p className="text-sm text-muted-foreground">ক্যারেক্টার ক্রিয়েটরে চরিত্র তৈরি করলে এখানে বাছতে পারবেন।</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {charList.map((c) => {
              const on = draft.characterIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set(
                      "characterIds",
                      on ? draft.characterIds.filter((id) => id !== c.id) : [...draft.characterIds, c.id],
                    )
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
        )}
      </fieldset>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">দৃশ্য বিভাজন</h3>
          <span className={cn("text-sm", mismatch ? "text-status-waiting" : "text-muted-foreground")}>
            মোট {toBnDigits(total)} / {toBnDigits(draft.targetDurationSec)} সেকেন্ড
          </span>
        </div>
        {mismatch && (
          <p className="text-sm text-status-waiting">দৃশ্যগুলোর মোট সময় টার্গেট থেকে অনেকটা আলাদা।</p>
        )}
        {draft.scenes.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            এখনও কোনো দৃশ্য নেই। নিচের বোতাম দিয়ে নিজে দৃশ্য যোগ করুন।
          </p>
        )}
        <ol className="space-y-3">
          {draft.scenes.map((scene, i) => (
            <li key={scene.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-display text-sm text-primary">দৃশ্য {toBnDigits(i + 1)}</span>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="উপরে সরান" disabled={i === 0} onClick={() => moveScene(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="নিচে সরান"
                    disabled={i === draft.scenes.length - 1}
                    onClick={() => moveScene(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`দৃশ্য ${i + 1} মুছুন`}
                    onClick={() => set("scenes", draft.scenes.filter((s) => s.id !== scene.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_7rem]">
                <Textarea
                  rows={2}
                  aria-label={`দৃশ্য ${i + 1} — দৃশ্যের বর্ণনা`}
                  placeholder="দৃশ্যে কী দেখা যাবে"
                  value={scene.visual}
                  onChange={(e) => setScene(scene.id, { visual: e.target.value })}
                />
                <Textarea
                  rows={2}
                  aria-label={`দৃশ্য ${i + 1} — সংলাপ বা বর্ণনা`}
                  placeholder="সংলাপ / ভয়েসওভার"
                  value={scene.narration}
                  onChange={(e) => setScene(scene.id, { narration: e.target.value })}
                />
                <div className="space-y-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-label={`দৃশ্য ${i + 1} — সময় (সেকেন্ড)`}
                    value={Number.isFinite(scene.durationSec) ? scene.durationSec : ""}
                    onChange={(e) => setScene(scene.id, { durationSec: Number(e.target.value) })}
                  />
                  <span className="text-xs text-muted-foreground">সেকেন্ড</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <FieldError id="sc-scenes-err" message={errors.scenes} />
        <Button
          type="button"
          variant="studio"
          onClick={() =>
            set("scenes", [...draft.scenes, { id: newId(), visual: "", narration: "", durationSec: 5 }])
          }
        >
          <Plus /> দৃশ্য যোগ করুন
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="submit">
          <Save /> {isExisting ? "পরিবর্তন সংরক্ষণ" : "স্ক্রিপ্ট সংরক্ষণ"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X /> বাতিল
          </Button>
        )}
      </div>
    </form>
  );
}

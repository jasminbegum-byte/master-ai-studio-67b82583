import { createFileRoute } from "@tanstack/react-router";
import { AppWindow, Download, ExternalLink, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { FieldError } from "@/components/common/FieldError";
import { HydrationGate } from "@/components/common/HydrationGate";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModeSwitch } from "@/components/workspace/ModeSwitch";
import { downloadJson, downloadText, safeFilename } from "@/lib/download";
import {
  buildBriefText, buildHandoffBundle, buildSrt, fitsMode, MODE_LABELS, PLATFORM_FIT_LABELS, setPreferred,
  validateProfileInput, validateResultFile, type EditorProfile, type ProfileErrors, type ProfileInput, type WorkspaceMode,
} from "@/lib/domain/workspace";
import { formatBytes } from "@/lib/domain/labels";
import { edits, newId, nowIso, projects, scripts, thumbnails } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import {
  addResult, getPrefs, getProfiles, removeProfile, removeResult, restoreStarters, savePrefs, upsertProfile,
  usePrefs, useProfiles, useResults, useWorkspaceMode,
} from "@/lib/store/workspace-store";

export const Route = createFileRoute("/editor-apps")({
  head: () => ({
    meta: [
      { title: "এডিটর অ্যাপ — Master AI Studio" },
      { name: "description", content: "মোবাইল ও কম্পিউটার মোডের জন্য পছন্দের বাহ্যিক ভিডিও এডিটর ও হ্যান্ডঅফ।" },
      { property: "og:title", content: "এডিটর অ্যাপ — Master AI Studio" },
      { property: "og:description", content: "বাহ্যিক এডিটর প্রোফাইল, এক্সপোর্ট ও ইমপোর্ট।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader icon={AppWindow} title="এডিটর অ্যাপ" description="বাহ্যিক এডিটর — এই ওয়েবসাইট কোনো অ্যাপ ইনস্টল বা চালু করতে পারে না; ফাইল ডাউনলোড করে নিজে খুলুন।" actions={<ModeSwitch />} />
      <HydrationGate><Body /></HydrationGate>
    </>
  );
}

const EMPTY: ProfileInput = { name: "", platform: "both", websiteUrl: "", launchUrl: "", importFormats: "MP4", exportFormats: "MP4", notes: "" };
const toInput = (p: EditorProfile): ProfileInput => ({ ...p, importFormats: p.importFormats.join(", "), exportFormats: p.exportFormats.join(", ") });

function Body() {
  const profiles = useProfiles();
  const prefs = usePrefs();
  const { mode } = useWorkspaceMode();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileInput>(EMPTY);
  const [errors, setErrors] = useState<ProfileErrors>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = validateProfileInput(form, getProfiles(), editId);
    if (!v.ok) { setErrors(v.errors); return; }
    const old = getProfiles().find((p) => p.id === editId);
    const at = nowIso();
    const p: EditorProfile = { id: old?.id ?? newId(), enabled: old?.enabled ?? true, isStarter: old?.isStarter ?? false, createdAt: old?.createdAt ?? at, updatedAt: at, ...v.value };
    if (safeSave(() => upsertProfile(p), "প্রোফাইল সংরক্ষিত")) { setForm(EMPTY); setEditId(null); setErrors({}); }
  }
  function prefer(m: WorkspaceMode, id: string | null) {
    const r = setPreferred(getPrefs(), getProfiles(), m, id);
    if (!r.ok) { toast.error(r.error); return; }
    safeSave(() => savePrefs(r.prefs), "পছন্দের এডিটর বদলানো হয়েছে");
  }
  const f = (k: keyof ProfileInput) => ({ id: `ep-${k}`, value: form[k], onChange: (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value }), "aria-invalid": !!errors[k] });

  return (
    <div className="space-y-5">
      <Section title="পছন্দের এডিটর" {...(mode ? { description: `এখন: ${MODE_LABELS[mode]}` } : {})}>
        <p className="text-sm text-muted-foreground">মোবাইল: {profiles.find((p) => p.id === prefs.mobile)?.name ?? "নেই"} · কম্পিউটার: {profiles.find((p) => p.id === prefs.computer)?.name ?? "নেই"}</p>
      </Section>
      <Section title="প্রোফাইল" actions={<Button variant="studio" size="sm" onClick={() => safeSave(restoreStarters, "শুরুর প্রোফাইল ফিরিয়ে আনা হয়েছে")}>শুরুর প্রোফাইল ফেরান</Button>}>
        <ul className="grid gap-2 md:grid-cols-2">
          {profiles.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{p.name}</p>
                <Badge variant="warning">বাহ্যিক · সরাসরি সংযুক্ত নয়</Badge>
                {!p.enabled && <Badge variant="outline">বন্ধ</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{PLATFORM_FIT_LABELS[p.platform]} · ইমপোর্ট: {p.importFormats.join(", ") || "—"} · এক্সপোর্ট: {p.exportFormats.join(", ") || "—"}</p>
              {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {(["mobile", "computer"] as const).map((m) => fitsMode(p.platform, m) && p.enabled && (
                  <Button key={m} size="sm" variant={prefs[m] === p.id ? "default" : "ghost"} aria-pressed={prefs[m] === p.id} onClick={() => prefer(m, prefs[m] === p.id ? null : p.id)}>
                    {MODE_LABELS[m]}-এ পছন্দের
                  </Button>
                ))}
                {p.websiteUrl && <Button asChild size="sm" variant="ghost"><a href={p.websiteUrl} target="_blank" rel="noopener noreferrer"><ExternalLink /> ওয়েবসাইট খুলুন</a></Button>}
                {p.launchUrl && <Button asChild size="sm" variant="ghost"><a href={p.launchUrl} rel="noopener noreferrer" title="অ্যাপ এই লিংক সমর্থন করলে তবেই খুলবে">লঞ্চ লিংক</a></Button>}
                <Button size="sm" variant="ghost" onClick={() => { setEditId(p.id); setForm(toInput(p)); setErrors({}); }}>এডিট</Button>
                <Button size="sm" variant="ghost" onClick={() => safeSave(() => upsertProfile({ ...p, enabled: !p.enabled, updatedAt: nowIso() }))}>{p.enabled ? "বন্ধ করুন" : "চালু করুন"}</Button>
                <ConfirmDelete itemLabel={p.name} onConfirm={() => safeSave(() => removeProfile(p.id), "প্রোফাইল মুছে ফেলা হয়েছে")} />
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={editId ? "প্রোফাইল এডিট" : "নতুন এডিটর যোগ করুন"}>
        <form onSubmit={submit} noValidate className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="ep-name">অ্যাপের নাম *</Label><Input {...f("name")} /><FieldError id="e-name" message={errors.name} /></div>
          <div className="space-y-1.5"><Label htmlFor="ep-platform">প্ল্যাটফর্ম *</Label>
            <select {...f("platform")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="mobile">মোবাইল</option><option value="desktop">ডেস্কটপ</option><option value="both">দুটোই</option>
            </select><FieldError id="e-pl" message={errors.platform} /></div>
          <div className="space-y-1.5"><Label htmlFor="ep-websiteUrl">ওয়েবসাইট/ডাউনলোড লিংক (ঐচ্ছিক)</Label><Input {...f("websiteUrl")} inputMode="url" /><FieldError id="e-w" message={errors.websiteUrl} /></div>
          <div className="space-y-1.5"><Label htmlFor="ep-launchUrl">লঞ্চ লিংক (ঐচ্ছিক)</Label><Input {...f("launchUrl")} /><FieldError id="e-l" message={errors.launchUrl} /></div>
          <div className="space-y-1.5"><Label htmlFor="ep-importFormats">ইমপোর্ট ফরম্যাট (কমা দিয়ে)</Label><Input {...f("importFormats")} /><FieldError id="e-i" message={errors.importFormats} /></div>
          <div className="space-y-1.5"><Label htmlFor="ep-exportFormats">এক্সপোর্ট ফরম্যাট</Label><Input {...f("exportFormats")} /><FieldError id="e-x" message={errors.exportFormats} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label htmlFor="ep-notes">নোট</Label><Textarea {...f("notes")} /><FieldError id="e-n" message={errors.notes} /></div>
          <div className="flex gap-2 md:col-span-2"><Button type="submit">সংরক্ষণ</Button>{editId && <Button type="button" variant="ghost" onClick={() => { setEditId(null); setForm(EMPTY); }}>বাতিল</Button>}</div>
        </form>
      </Section>
      <Handoff mode={mode ?? "mobile"} />
    </div>
  );
}

function Handoff({ mode }: { mode: WorkspaceMode }) {
  const list = projects.useAll();
  const profiles = useProfiles();
  const prefs = usePrefs();
  const results = useResults();
  const [pid, setPid] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const project = list.find((p) => p.id === pid);
  const editor = profiles.find((p) => p.id === prefs[mode]) ?? null;
  const input = () => project && { project, scripts: scripts.getAll(), edits: edits.getAll(), thumbnails: thumbnails.getAll(), editor, mode, at: nowIso() };
  const name = project ? safeFilename(project.title) : "";

  function importFile(file: File | undefined) {
    setErr(null);
    if (!file) return;
    const e = validateResultFile(file);
    if (e) { setErr(e); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    safeSave(() => addResult({ id: newId(), projectId: pid || null, editorName: editor?.name ?? null, fileName: file.name, sizeBytes: file.size, mimeType: file.type, durationSec: null, note: "", importedAt: nowIso() }), "ফলাফল এই ডিভাইসে যুক্ত হয়েছে (আপলোড হয়নি)");
  }
  return (
    <Section title="হ্যান্ডঅফ: এক্সপোর্ট ও ইমপোর্ট" description="ফাইল ডাউনলোড করে নিজের এডিটরে খুলুন। নেটিভ প্রজেক্ট ফাইল তৈরি হয় না।">
      <Label htmlFor="ho-p">প্রজেক্ট</Label>
      <select id="ho-p" value={pid} onChange={(e) => setPid(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        <option value="">প্রজেক্ট বাছুন</option>
        {list.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="studio" disabled={!project} onClick={() => { const i = input(); if (i) downloadText(buildBriefText(i), `${name}-brief.txt`); }}><Download /> ব্রিফ (TXT)</Button>
        <Button variant="studio" disabled={!project} onClick={() => { const i = input(); if (i) downloadJson(buildHandoffBundle(i), `${name}-handoff.json`); }}><Download /> প্রজেক্ট ডেটা (JSON)</Button>
        <Button variant="studio" disabled={!project} onClick={() => {
          const s = scripts.getAll().find((x) => x.projectId === pid && x.scenes.some((sc) => sc.narration.trim()));
          if (!s) { toast.error("এই প্রজেক্টের স্ক্রিপ্টে কোনো বর্ণনা নেই।"); return; }
          downloadText(buildSrt(s.scenes), `${name}.srt`);
        }}><Download /> সাবটাইটেল (SRT)</Button>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="ho-in" className="flex items-center gap-2"><Upload className="size-4" /> এডিট করা ভিডিও ইমপোর্ট (MP4/MOV/WEBM/MKV, সর্বোচ্চ ২ GB — কোথাও আপলোড হয় না)</Label>
        <Input id="ho-in" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mkv,.mov" onChange={(e) => importFile(e.target.files?.[0])} aria-describedby="ho-err" />
        <FieldError id="ho-err" message={err} />
        {preview && <video src={preview} controls className="mt-2 max-h-80 w-full rounded-lg bg-muted" />}
      </div>
      {results.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-border p-2">
              <span>{r.fileName} · {formatBytes(r.sizeBytes)} · {r.editorName ?? "—"}</span>
              <ConfirmDelete itemLabel={r.fileName} onConfirm={() => safeSave(() => removeResult(r.id))} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

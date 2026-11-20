import { createFileRoute } from "@tanstack/react-router";
import { Copy, FilePlus2, Pencil, Save, UserRound, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { AgentAssistPanel } from "@/components/agents/AgentAssistPanel";
import { EmptyState } from "@/components/common/EmptyState";
import { FieldError } from "@/components/common/FieldError";
import { HydrationGate } from "@/components/common/HydrationGate";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copyText } from "@/lib/download";
import { formatBnDate, toBnDigits } from "@/lib/domain/labels";
import { buildCharacterReference } from "@/lib/domain/prompts";
import { characters, newId, nowIso, scripts } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { Character } from "@/lib/store/types";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "ক্যারেক্টার ক্রিয়েটর — Master AI Studio" },
      { name: "description", content: "চরিত্রের চেহারা, পোশাক, কণ্ঠ ও ধারাবাহিকতার নোট সংরক্ষণ করে বারবার ব্যবহার করুন।" },
      { property: "og:title", content: "ক্যারেক্টার ক্রিয়েটর — Master AI Studio" },
      { property: "og:description", content: "পুনর্ব্যবহারযোগ্য চরিত্র প্রোফাইল।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CharactersPage,
});

function emptyCharacter(): Character {
  const at = nowIso();
  return {
    id: newId(),
    name: "",
    visualDescription: "",
    clothing: "",
    voiceNotes: "",
    continuityNotes: "",
    isExample: false,
    createdAt: at,
    updatedAt: at,
  };
}

function CharactersPage() {
  return (
    <>
      <PageHeader
        icon={UserRound}
        title="ক্যারেক্টার ক্রিয়েটর"
        description="একবার চরিত্র তৈরি করুন, তারপর স্ক্রিপ্ট ও অ্যানিমেশনে একই চেহারা ধরে রাখুন।"
      />
      <HydrationGate>
        <CharactersBody />
      </HydrationGate>
    </>
  );
}

function CharactersBody() {
  const list = characters.useAll();
  const scriptList = scripts.useAll();
  const [editing, setEditing] = useState<Character>(() => emptyCharacter());
  const [formKey, setFormKey] = useState(0);

  const open = (c: Character) => {
    setEditing(c);
    setFormKey((k) => k + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
      <Section
        title={characters.get(editing.id) ? "চরিত্র সম্পাদনা" : "নতুন চরিত্র"}
        className="h-fit"
        actions={
          characters.get(editing.id) ? (
            <Button variant="studio" size="sm" onClick={() => open(emptyCharacter())}>
              <FilePlus2 /> নতুন
            </Button>
          ) : null
        }
      >
        <CharacterForm key={formKey} initial={editing} onSaved={setEditing} onCancel={() => open(emptyCharacter())} />
      </Section>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          সংরক্ষিত চরিত্র ({toBnDigits(list.length)})
        </h2>
        {list.length === 0 ? (
          <EmptyState icon={UserRound} title="কোনো চরিত্র নেই" description="প্রথম চরিত্রের প্রোফাইল তৈরি করুন।" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((c) => {
              const usedIn = scriptList.filter((s) => s.characterIds.includes(c.id)).length;
              return (
                <li key={c.id} className="studio-card flex flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-10 place-items-center rounded-full bg-primary/15 font-display text-lg text-primary">
                      {c.name.replace(/^\[উদাহরণ\]\s*/, "").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {toBnDigits(usedIn)}টি স্ক্রিপ্টে · {formatBnDate(c.updatedAt)}
                      </p>
                    </div>
                    {c.isExample && <Badge variant="teal">উদাহরণ</Badge>}
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {c.visualDescription && <Row label="চেহারা" value={c.visualDescription} />}
                    {c.clothing && <Row label="পোশাক" value={c.clothing} />}
                    {c.voiceNotes && <Row label="কণ্ঠ" value={c.voiceNotes} />}
                    {c.continuityNotes && <Row label="ধারাবাহিকতা" value={c.continuityNotes} />}
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-1 pt-3">
                    <Button variant="ghost" size="sm" onClick={() => open(c)}>
                      <Pencil /> এডিট
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const ok = await copyText(buildCharacterReference(c));
                        if (ok) toast.success("রেফারেন্স কপি হয়েছে");
                        else toast.error("কপি করা যায়নি");
                      }}
                    >
                      <Copy /> রেফারেন্স কপি
                    </Button>
                    <ConfirmDelete
                      itemLabel={c.name}
                      onConfirm={() => {
                        safeSave(() => {
                          characters.remove(c.id);
                          scripts.replaceAll(
                            scripts.getAll().map((s) =>
                              s.characterIds.includes(c.id)
                                ? { ...s, characterIds: s.characterIds.filter((id) => id !== c.id) }
                                : s,
                            ),
                          );
                        }, "চরিত্র মুছে ফেলা হয়েছে");
                        if (editing.id === c.id) open(emptyCharacter());
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground/90">{value}</dd>
    </div>
  );
}

function CharacterForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: Character;
  onSaved: (c: Character) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const exists = characters.get(initial.id) !== undefined;
  const set = <K extends keyof Character>(k: K, v: Character[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.name.trim().length < 1) return setError("চরিত্রের নাম দিন।");
    if (draft.visualDescription.trim().length < 5) return setError("চেহারার বর্ণনা কমপক্ষে ৫ অক্ষরে দিন।");
    setError(null);
    const saved = { ...draft, name: draft.name.trim(), updatedAt: nowIso() };
    if (safeSave(() => characters.upsert(saved), exists ? "চরিত্র হালনাগাদ হয়েছে" : "চরিত্র সংরক্ষিত হয়েছে")) {
      onSaved(saved);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">\n      <AgentAssistPanel agentId="character" title="AI Character Agent" instruction={`চরিত্রের নাম ${draft.name}। তার চেহারা, পোশাক, কণ্ঠ ও ধারাবাহিকতার জন্য উন্নত character bible তৈরি করো।`} context={`চেহারা: ${draft.visualDescription}\\nপোশাক: ${draft.clothing}\\nকণ্ঠ: ${draft.voiceNotes}\\nধারাবাহিকতা: ${draft.continuityNotes}`} />
      <div className="space-y-1.5">
        <Label htmlFor="ch-name">নাম *</Label>
        <Input id="ch-name" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="যেমন: রাজু" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ch-visual">চেহারার বর্ণনা *</Label>
        <Textarea
          id="ch-visual"
          rows={3}
          value={draft.visualDescription}
          onChange={(e) => set("visualDescription", e.target.value)}
          placeholder="বয়স, গঠন, চুল, চোখ, গায়ের রং…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ch-cloth">পোশাক</Label>
        <Textarea id="ch-cloth" rows={2} value={draft.clothing} onChange={(e) => set("clothing", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ch-voice">কণ্ঠের নোট</Label>
        <Textarea
          id="ch-voice"
          rows={2}
          value={draft.voiceNotes}
          onChange={(e) => set("voiceNotes", e.target.value)}
          placeholder="যেমন: গম্ভীর, ধীর লয়ে কথা বলে"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ch-cont">ধারাবাহিকতার নোট</Label>
        <Textarea
          id="ch-cont"
          rows={2}
          value={draft.continuityNotes}
          onChange={(e) => set("continuityNotes", e.target.value)}
          placeholder="প্রতি দৃশ্যে যা একই থাকবে"
        />
      </div>
      <FieldError id="ch-err" message={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          <Save /> {exists ? "পরিবর্তন সংরক্ষণ" : "চরিত্র সংরক্ষণ"}
        </Button>
        {exists && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X /> বাতিল
          </Button>
        )}
      </div>
    </form>
  );
}

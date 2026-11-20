import { createFileRoute } from "@tanstack/react-router";
import { Download, FilePlus2, Loader2, Pencil, ScrollText, Wand2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { EmptyState } from "@/components/common/EmptyState";
import { HydrationGate } from "@/components/common/HydrationGate";
import { NotConnectedNotice } from "@/components/common/NotConnectedNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { useProjectTitle } from "@/components/common/ProjectSelect";
import { Section } from "@/components/common/Section";
import { emptyScript, ScriptEditor } from "@/components/script/ScriptEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { copyText, downloadText, safeFilename } from "@/lib/download";
import { runSpecialistAgent } from "@/lib/ai/providers.functions";
import { useProviderStatus } from "@/lib/ai/use-provider-status";
import { formatBnDate, PLATFORM_LABELS, toBnDigits } from "@/lib/domain/labels";
import { scriptToText } from "@/lib/domain/prompts";
import { characters, scripts } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { Script } from "@/lib/store/types";

export const Route = createFileRoute("/script")({
  // ?id=<scriptId> opens that saved draft (used by the Master Controller plan).
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" && search["id"] ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "স্ক্রিপ্ট এজেন্ট — Master AI Studio" },
      { name: "description", content: "বাংলা গল্প থেকে Reels-এর জন্য দৃশ্যভিত্তিক স্ক্রিপ্ট লিখুন ও সংরক্ষণ করুন।" },
      { property: "og:title", content: "স্ক্রিপ্ট এজেন্ট — Master AI Studio" },
      { property: "og:description", content: "সম্পাদনযোগ্য স্ক্রিপ্ট ও দৃশ্য বিভাজন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScriptPage,
});

function ScriptPage() {
  return (
    <>
      <PageHeader
        icon={ScrollText}
        title="স্ক্রিপ্ট এজেন্ট"
        description="গল্প লিখুন, প্ল্যাটফর্ম ও সময় ঠিক করুন, তারপর দৃশ্য ভাগ করে সংরক্ষণ করুন।"
      />
      <HydrationGate>
        <ScriptBody />
      </HydrationGate>
    </>
  );
}

function ScriptBody() {
  const list = scripts.useAll();
  const charList = characters.useAll();
  const projectTitle = useProjectTitle();
  const { id: requestedId } = Route.useSearch();
  const requested = requestedId ? scripts.get(requestedId) : undefined;
  const [editing, setEditing] = useState<Script>(() => requested ?? emptyScript());
  const [editorKey, setEditorKey] = useState(0);
  const providerStatus = useProviderStatus();
  const textConfigured = providerStatus.data?.find((item) => item.id === "text")?.configured === true;
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [aiError, setAiError] = useState("");

  async function generateWithAi() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError("");
    setAiOutput("");
    try {
      const result = await runSpecialistAgent({ data: {
        agentId: "script",
        mode: "automatic",
        instruction: `এই ধারণার ভিত্তিতে সম্পূর্ণ দৃশ্যভিত্তিক বাংলা ভিডিও স্ক্রিপ্ট তৈরি করো। প্রতিটি দৃশ্যে সময়, লোকেশন, ভিজ্যুয়াল, চরিত্রের কাজ, সংলাপ/ভয়েসওভার এবং পরের দৃশ্যে যাওয়ার ধারাবাহিকতা দাও।\nশিরোনাম: ${editing.title}\nমূল ধারণা: ${editing.idea}\nভিডিও ধরন: ${editing.style}\nপ্ল্যাটফর্ম: ${editing.platform}\nসময়: ${editing.targetDurationSec} সেকেন্ড`,
        context: charList.map((character) => `${character.name}: ${character.visualDescription}; পোশাক: ${character.clothing}; continuity: ${character.continuityNotes}`).join("\n"),
      }});
      if (result.ok) setAiOutput(result.reply);
      else setAiError(result.message);
    } catch {
      setAiError("AI স্ক্রিপ্ট তৈরি করা যায়নি। সংযোগ পরীক্ষা করুন।");
    } finally {
      setAiBusy(false);
    }
  }

  function openEditor(s: Script) {
    setEditing(s);
    setEditorKey((k) => k + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <NotConnectedNotice title="AI স্ক্রিপ্ট জেনারেশন">
          টেক্সট AI প্রোভাইডার যুক্ত না হওয়া পর্যন্ত এই এজেন্ট নিজে স্ক্রিপ্ট লেখে না। আপনি নিজে দৃশ্য লিখে
          সংরক্ষণ করতে পারবেন; সংযোগের পরে এই খসড়াগুলোই AI-কে দেওয়া যাবে।
        </NotConnectedNotice>
        {requestedId && !requested && (
          <p role="alert" className="rounded-lg border border-status-failed/40 bg-status-failed/10 p-3 text-sm text-foreground">
            অনুরোধ করা স্ক্রিপ্ট খসড়াটি পাওয়া যায়নি — হয়তো মুছে ফেলা হয়েছে। ডান দিকের তালিকা থেকে বাছুন বা নতুন লিখুন।
          </p>
        )}
        {requested && editing.id === requested.id && requested.scenes.length === 0 && (
          <p role="status" className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
            মাস্টার কন্ট্রোলারের খসড়া খোলা হয়েছে। নিচে “দৃশ্য যোগ করুন” দিয়ে দৃশ্যগুলো নিজে লিখে সংরক্ষণ করুন।
          </p>
        )}
        <Section
          title={scripts.get(editing.id) ? "স্ক্রিপ্ট সম্পাদনা" : "নতুন স্ক্রিপ্ট"}
          actions={
            scripts.get(editing.id) ? (
              <Button variant="studio" size="sm" onClick={() => openEditor(emptyScript())}>
                <FilePlus2 /> নতুন
              </Button>
            ) : null
          }
        >
          <ScriptEditor
            key={editorKey}
            initial={editing}
            onSaved={(s) => setEditing(s)}
            onCancel={scripts.get(editing.id) ? () => openEditor(emptyScript()) : undefined}
          />
        </Section>
      </div>

      <Section title={`সংরক্ষিত স্ক্রিপ্ট (${toBnDigits(list.length)})`} className="h-fit">
        {list.length === 0 ? (
          <EmptyState icon={ScrollText} title="কোনো স্ক্রিপ্ট নেই" description="প্রথম স্ক্রিপ্টটি বাম দিকের ফর্মে লিখুন।" />
        ) : (
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={s.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{s.title}</p>
                  {s.isExample && <Badge variant="teal">উদাহরণ</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {PLATFORM_LABELS[s.platform]} · {toBnDigits(s.scenes.length)} দৃশ্য · {formatBnDate(s.updatedAt)}
                  {projectTitle(s.projectId) && ` · ${projectTitle(s.projectId)}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditor(s)}>
                    <Pencil /> এডিট
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadText(scriptToText(s, charList), `${safeFilename(s.title)}.txt`)}
                  >
                    <Download /> টেক্সট
                  </Button>
                  <ConfirmDelete
                    itemLabel={s.title}
                    onConfirm={() => {
                      safeSave(() => scripts.remove(s.id), "স্ক্রিপ্ট মুছে ফেলা হয়েছে");
                      if (editing.id === s.id) openEditor(emptyScript());
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

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bot } from "lucide-react";
import { useState } from "react";

import { AgentStatusPill } from "@/components/agents/AgentStatusPill";
import { HydrationGate } from "@/components/common/HydrationGate";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { runAgent } from "@/lib/agents/agents.functions";
import { executeJob, makeJob, upsertJob, useJobs } from "@/lib/agents/jobs";
import { activeAgentCount, AGENTS, latestStatus, validateScriptInput } from "@/lib/agents/registry";
import { toBnDigits } from "@/lib/domain/labels";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "এজেন্ট সিস্টেম — Master AI Studio" },
      { name: "description", content: "প্রতিটি এজেন্টের আসল অবস্থা, কাজের ইতিহাস ও সংযোগ।" },
      { property: "og:title", content: "এজেন্ট সিস্টেম — Master AI Studio" },
      { property: "og:description", content: "এজেন্টের কাজ ও সংযোগের সৎ অবস্থা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <>
      <PageHeader icon={Bot} title="এজেন্ট সিস্টেম" description="শুধু সত্যিই চলমান কাজকে সক্রিয় গণনা করা হয়।" />
      <HydrationGate><Body /></HydrationGate>
    </>
  ),
});

function Body() {
  const jobs = useJobs();
  const run = useServerFn(runAgent);
  const [idea, setIdea] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function startScript() {
    const input = { idea, platform: "facebook_reels", durationSec: 30, language: "bn", style: "" };
    const e = validateScriptInput(input);
    setErr(e);
    if (e) return;
    const job = makeJob("script", { instruction: idea, scriptInput: input });
    upsertJob(job);
    void executeJob(job.id, run);
  }
  return (
    <div className="space-y-5">
      <Section title={`এখন সক্রিয়: ${toBnDigits(activeAgentCount(jobs))} জন`}>
        <ul className="grid gap-2 md:grid-cols-2">
          {AGENTS.map((a) => (
            <li key={a.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2"><p className="font-medium">{a.name}</p><AgentStatusPill status={latestStatus(jobs, a.id)} /></div>
              <p className="mt-1 text-xs text-muted-foreground">{a.task}</p>
              <p className="text-xs text-muted-foreground">ইনপুট: {a.input} · আউটপুট: {a.output}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="স্ক্রিপ্ট এজেন্টকে কাজ দিন">
        <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} aria-label="আইডিয়া" placeholder="ভিডিও আইডিয়া লিখুন…" />
        {err && <p className="mt-1 text-sm text-destructive">{err}</p>}
        <Button className="mt-2" onClick={startScript}>চালান</Button>
      </Section>
      <Section title="কাজের ইতিহাস">
        {jobs.length === 0 ? <p className="text-sm text-muted-foreground">এখনও কোনো কাজ নেই।</p> : (
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="rounded border border-border p-2 text-sm">
                <div className="flex justify-between gap-2"><span>{AGENTS.find((a) => a.id === j.agentId)?.name}</span><AgentStatusPill status={j.status} /></div>
                {j.message && <p className="text-xs text-muted-foreground">{j.message}</p>}
                {j.scriptOutput && <p className="mt-1 text-xs">{j.scriptOutput.title}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProviderStatus } from "@/lib/ai/use-provider-status";
import { runSpecialistAgent } from "@/lib/ai/providers.functions";
import type { AgentId, AgentMode } from "@/lib/agents/registry";
import { copyText } from "@/lib/download";
import { toast } from "sonner";

interface AgentAssistPanelProps {
  agentId: Exclude<AgentId, "master" | "script">;
  instruction: string;
  context?: string;
  mode?: AgentMode;
  title?: string;
}

export function AgentAssistPanel({
  agentId,
  instruction,
  context,
  mode = "automatic",
  title = "AI এজেন্ট সহায়তা",
}: AgentAssistPanelProps) {
  const providerStatus = useProviderStatus();
  const configured = providerStatus.data?.find((item) => item.id === "text")?.configured === true;
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    if (!configured || busy || instruction.trim().length < 10) return;
    setBusy(true);
    setError("");
    setOutput("");
    try {
      const result = await runSpecialistAgent({ data: { agentId, mode, instruction, context } });
      if (result.ok) setOutput(result.reply);
      else setError(result.message);
    } catch {
      setError("AI এজেন্টের উত্তর আনা যায়নি। সার্ভার সংযোগ পরীক্ষা করুন।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {configured ? "সংরক্ষিত তথ্য থেকে AI নির্দেশনা তৈরি হবে।" : "AI ব্যবহারের জন্য সার্ভারে GEMINI_API_KEY secret সেট করতে হবে।"}
        </p>
      </div>
      <Button type="button" variant="studio" size="sm" onClick={generate} disabled={!configured || busy || instruction.trim().length < 10}>
        {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy ? "তৈরি হচ্ছে…" : "AI দিয়ে তৈরি করুন"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {output && (
        <div className="space-y-2">
          <Textarea value={output} readOnly rows={9} aria-label="AI এজেন্টের ফলাফল" />
          <Button type="button" variant="ghost" size="sm" onClick={async () => {
            if (await copyText(output)) toast.success("AI ফলাফল কপি হয়েছে");
            else toast.error("কপি করা যায়নি");
          }}>ফলাফল কপি করুন</Button>
          <p className="text-xs text-muted-foreground">এটি পর্যালোচনার জন্য AI-তৈরি খসড়া; এটি নিজে কোনো ছবি, ভিডিও বা অডিও রেন্ডার করে না।</p>
        </div>
      )}
    </section>
  );
}

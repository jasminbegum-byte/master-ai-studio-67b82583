import { createFileRoute } from "@tanstack/react-router";
import { Download, Settings, Upload } from "lucide-react";

import { HydrationGate } from "@/components/common/HydrationGate";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVIDER_SLOTS } from "@/lib/ai/provider-slots";
import { useProviderStatus } from "@/lib/ai/use-provider-status";
import { downloadJson } from "@/lib/download";
import { removeExampleTemplates } from "@/lib/domain/example";
import { buildExportBundle, parseImportBundle } from "@/lib/domain/export";
import { formatBytes } from "@/lib/domain/labels";
import { ALL_COLLECTIONS, nowIso } from "@/lib/store/collections";
import { estimateUsageBytes } from "@/lib/store/local-store";
import { safeSave } from "@/lib/store/safe-save";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "সেটিংস — Master AI Studio" },
      { name: "description", content: "প্রোভাইডার সংযোগ, ডেটা এক্সপোর্ট/ইমপোর্ট ও ফ্রি-ফার্স্ট নীতি।" },
      { property: "og:title", content: "সেটিংস — Master AI Studio" },
      { property: "og:description", content: "সংযোগ ও ডেটা নিয়ন্ত্রণ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const status = useProviderStatus();
  return (
    <>
      <PageHeader icon={Settings} title="সেটিংস" />
      <div className="space-y-5">
        <Section title="ফ্রি-ফার্স্ট নীতি">
          <p className="text-sm text-muted-foreground">
            আপনার স্পষ্ট অনুমতি ছাড়া কোনো পেইড API, সাবস্ক্রিপশন, ক্লাউড ডেটাবেস বা স্বয়ংক্রিয় প্রকাশ চালু বা কেনা হবে না। API কী শুধু সার্ভারের গোপন সেটিংসে রাখা হবে, কখনও ব্রাউজারে নয়।
          </p>
        </Section>
        <Section title="প্রোভাইডার সংযোগ">
          <ul className="space-y-3">
            {PROVIDER_SLOTS.map((p) => {
              const on = status.data?.find((s) => s.id === p.id)?.configured;
              return (
                <li key={p.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <Badge variant={on ? "teal" : "warning"}>{status.isPending ? "যাচাই হচ্ছে…" : on ? "সংযুক্ত" : "সংযুক্ত নয়"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">ব্যবহার: {p.usedBy}</p>
                  <p className="text-xs text-muted-foreground">প্রয়োজন: {p.requirement}</p>
                </li>
              );
            })}
          </ul>
        </Section>
        <HydrationGate rows={1}>
          <DataControls />
        </HydrationGate>
      </div>
    </>
  );
}

function DataControls() {
  function exportAll() {
    const data = Object.fromEntries(Object.entries(ALL_COLLECTIONS).map(([k, c]) => [k, c.getAll()]));
    downloadJson(buildExportBundle(data as never, nowIso()), `master-ai-studio-${nowIso().slice(0, 10)}.json`);
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    const res = parseImportBundle(await file.text());
    if (!res.ok) return toast.error(res.error);
    safeSave(() => {
      for (const [k, c] of Object.entries(ALL_COLLECTIONS)) {
        c.replaceAll((res.bundle.data as Record<string, never[]>)[k] ?? []);
      }
    }, "ডেটা ইমপোর্ট হয়েছে");
  }
  return (
    <Section title="ডেটা" description={`এই ডিভাইসে ব্যবহৃত: ${formatBytes(estimateUsageBytes())}`}>
      <div className="flex flex-wrap gap-2">
        <Button variant="studio" onClick={exportAll}>
          <Download /> সব ডেটা JSON এক্সপোর্ট
        </Button>
        <Button variant="studio" onClick={() => safeSave(removeExampleTemplates, "উদাহরণ মুছে ফেলা হয়েছে")}>
          উদাহরণ টেমপ্লেট মুছুন
        </Button>
        <ConfirmDelete
          itemLabel="সব ডেটা"
          triggerLabel="সব ডেটা মুছুন"
          onConfirm={() => safeSave(() => Object.values(ALL_COLLECTIONS).forEach((c) => c.clear()), "সব ডেটা মুছে ফেলা হয়েছে")}
        />
      </div>
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="import-file" className="flex items-center gap-2">
          <Upload className="size-4" /> JSON ইমপোর্ট (বর্তমান ডেটা প্রতিস্থাপিত হবে)
        </Label>
        <Input id="import-file" type="file" accept="application/json,.json" onChange={(e) => importFile(e.target.files?.[0])} />
      </div>
    </Section>
  );
}

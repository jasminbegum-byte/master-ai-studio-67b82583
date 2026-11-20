import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Clapperboard,
  Database,
  FolderPlus,
  HardDrive,
  ImageIcon,
  LayoutDashboard,
  PlugZap,
  ScrollText,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { HydrationGate } from "@/components/common/HydrationGate";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { JobPill } from "@/components/common/StatusPill";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { useProviderStatus } from "@/lib/ai/use-provider-status";
import { addExampleTemplate } from "@/lib/domain/example";
import { formatBnDate, PLATFORM_LABELS, STAGE_LABELS, toBnDigits } from "@/lib/domain/labels";
import {
  completedStageCount,
  deriveJobStatus,
  PRODUCTION_STAGES,
  STAGE_ORDER,
} from "@/lib/domain/production";
import { characters, projects, scripts, thumbnails } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড — Master AI Studio" },
      {
        name: "description",
        content: "আপনার ভিডিও প্রজেক্ট, প্রোডাকশন স্টেজ ও সেটআপ অবস্থা এক জায়গায়।",
      },
      { property: "og:title", content: "ড্যাশবোর্ড — Master AI Studio" },
      {
        property: "og:description",
        content: "বাংলা ক্রিয়েটরের জন্য AI ভিডিও প্রোডাকশন ড্যাশবোর্ড।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="ড্যাশবোর্ড"
        description="আপনার প্রজেক্ট, প্রোডাকশন স্টেজ আর সংযোগের আসল অবস্থা — কোনো বানানো ডেটা নেই।"
        actions={
          <>
            <Button asChild variant="hero">
              <Link to="/controller">
                <Workflow /> কন্ট্রোলারে ব্রিফ দিন
              </Link>
            </Button>
            <CreateProjectDialog triggerVariant="studio" />
          </>
        }
      />
      <HydrationGate rows={4}>
        <DashboardBody />
      </HydrationGate>
    </>
  );
}

function DashboardBody() {
  const projectList = projects.useAll();
  const scriptCount = scripts.useAll().length;
  const characterCount = characters.useAll().length;
  const briefCount = thumbnails.useAll().length;

  const recent = [...projectList].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <section aria-label="সংরক্ষিত ডেটা" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={FolderPlus} label="প্রজেক্ট" value={projectList.length} to="/monitor" />
          <Stat icon={ScrollText} label="স্ক্রিপ্ট" value={scriptCount} to="/script" />
          <Stat icon={UserRound} label="চরিত্র" value={characterCount} to="/characters" />
          <Stat icon={ImageIcon} label="থাম্বনেইল ব্রিফ" value={briefCount} to="/thumbnail" />
        </section>

        <Section
          title="সাম্প্রতিক প্রজেক্ট"
          actions={
            projectList.length > 0 ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/monitor">
                  সব দেখুন <ArrowRight />
                </Link>
              </Button>
            ) : null
          }
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={Clapperboard}
              title="এখনও কোনো প্রজেক্ট নেই"
              description="প্রথম প্রজেক্ট তৈরি করুন। চাইলে একটি চিহ্নিত উদাহরণ টেমপ্লেট যোগ করে দেখে নিতে পারেন — পরে মুছে ফেলা যাবে।"
              action={
                <>
                  <CreateProjectDialog />
                  <Button
                    variant="studio"
                    onClick={() => safeSave(addExampleTemplate, "উদাহরণ টেমপ্লেট যোগ হয়েছে")}
                  >
                    <Sparkles />
                    উদাহরণ টেমপ্লেট যোগ করুন
                  </Button>
                </>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/monitor"
                    search={{ project: p.id }}
                    className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-3 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {PLATFORM_LABELS[p.platform]} · হালনাগাদ {formatBnDate(p.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {toBnDigits(completedStageCount(p))}/{toBnDigits(PRODUCTION_STAGES.length)} স্টেজ সম্পন্ন
                      </span>
                      <JobPill status={deriveJobStatus(p)} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="ওয়ার্কফ্লো স্টেজ"
          description="প্রতিটি স্টেজে কতগুলো প্রজেক্ট আপনি ‘সম্পন্ন’ চিহ্নিত করেছেন।"
        >
          <ol className="grid gap-2 sm:grid-cols-3">
            {STAGE_ORDER.map((stage, i) => {
              const done = projectList.filter((p) => p.stages[stage]?.status === "done").length;
              return (
                <li key={stage} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-display text-sm text-muted-foreground">
                    {toBnDigits(i + 1)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{STAGE_LABELS[stage]}</p>
                    <p className="text-xs text-muted-foreground">
                      {projectList.length === 0
                        ? "কোনো প্রজেক্ট নেই"
                        : `${toBnDigits(done)} / ${toBnDigits(projectList.length)} সম্পন্ন`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      </div>

      <SetupStatus />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof FolderPlus;
  label: string;
  value: number;
  to: "/monitor" | "/script" | "/characters" | "/thumbnail";
}) {
  return (
    <Link
      to={to}
      className="studio-card flex flex-col gap-2 p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-5 text-primary" aria-hidden />
      <span className="font-display text-3xl font-semibold text-foreground">{toBnDigits(value)}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </Link>
  );
}

function SetupStatus() {
  const status = useProviderStatus();
  const connected = status.data?.filter((s) => s.configured).length ?? 0;
  const total = status.data?.length ?? 5;

  return (
    <aside className="space-y-5">
      <Section title="সেটআপ অবস্থা">
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <HardDrive className="mt-0.5 size-4 shrink-0 text-status-done" aria-hidden />
            <div>
              <p className="font-medium text-foreground">লোকাল সংরক্ষণ চালু</p>
              <p className="text-muted-foreground">ডেটা শুধু এই ব্রাউজারে থাকে। নিয়মিত এক্সপোর্ট করুন।</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <PlugZap className="mt-0.5 size-4 shrink-0 text-status-waiting" aria-hidden />
            <div>
              <p className="font-medium text-foreground">
                AI প্রোভাইডার:{" "}
                {status.isPending
                  ? "যাচাই হচ্ছে…"
                  : status.isError
                    ? "অবস্থা জানা যায়নি"
                    : `${toBnDigits(connected)} / ${toBnDigits(total)} সংযুক্ত`}
              </p>
              <p className="text-muted-foreground">
                {status.isError
                  ? "সার্ভারের সাথে যোগাযোগ হয়নি। পরে আবার চেষ্টা করুন।"
                  : "সংযোগ ছাড়া কোনো AI জেনারেশন চলে না; ফর্ম ও সংরক্ষণ কাজ করে।"}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-medium text-foreground">ক্লাউড ডেটাবেস: বন্ধ</p>
              <p className="text-muted-foreground">আপনার অনুমতি ছাড়া চালু করা হবে না।</p>
            </div>
          </li>
        </ul>
        <Button asChild variant="studio" className="mt-4 w-full">
          <Link to="/settings">সেটিংস ও সংযোগ</Link>
        </Button>
      </Section>
      <Section title="দ্রুত শুরু">
        <div className="grid gap-2">
          <Button asChild variant="studio" className="justify-start">
            <Link to="/controller">
              <Workflow /> মাস্টার কন্ট্রোলারে ভিডিও ব্রিফ
            </Link>
          </Button>
          <Button asChild variant="studio" className="justify-start">
            <Link to="/script">
              <ScrollText /> নতুন স্ক্রিপ্ট লিখুন
            </Link>
          </Button>
          <Button asChild variant="studio" className="justify-start">
            <Link to="/characters">
              <UserRound /> চরিত্র তৈরি করুন
            </Link>
          </Button>
          <Button asChild variant="studio" className="justify-start">
            <Link to="/thumbnail">
              <ImageIcon /> থাম্বনেইল ব্রিফ
            </Link>
          </Button>
        </div>
      </Section>
    </aside>
  );
}

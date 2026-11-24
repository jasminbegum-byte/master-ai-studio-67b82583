import { Laptop, Smartphone, Wand2 } from "lucide-react";

import { MODE_LABELS, type WorkspaceModeSetting } from "@/lib/domain/workspace";
import { useWorkspaceMode } from "@/lib/store/workspace-store";
import { safeSave } from "@/lib/store/safe-save";
import { cn } from "@/lib/utils";

const OPTIONS: { id: WorkspaceModeSetting; icon: typeof Laptop; short: string }[] = [
  { id: "mobile", icon: Smartphone, short: "মোবাইল" },
  { id: "computer", icon: Laptop, short: "কম্পিউটার" },
  { id: "auto", icon: Wand2, short: "অটো" },
];

/** Segmented radio control; arrow keys move between options. */
export function ModeSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { setting, mode, setSetting } = useWorkspaceMode();
  const choose = (id: WorkspaceModeSetting) => safeSave(() => setSetting(id));
  return (
    <div
      role="radiogroup"
      aria-label="ওয়ার্কস্পেস মোড"
      className={cn("inline-flex rounded-lg border border-border bg-surface p-0.5", className)}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        const i = OPTIONS.findIndex((o) => o.id === setting);
        const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        const next = OPTIONS[(i + d + OPTIONS.length) % OPTIONS.length];
        if (next) {
          choose(next.id);
          (e.currentTarget.querySelector(`[data-mode="${next.id}"]`) as HTMLElement | null)?.focus();
        }
      }}
    >
      {OPTIONS.map((o) => {
        const on = setting === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-mode={o.id}
            tabIndex={on ? 0 : -1}
            title={o.id === "auto" && mode ? `স্বয়ংক্রিয় (এখন: ${MODE_LABELS[mode]})` : MODE_LABELS[o.id]}
            onClick={() => choose(o.id)}
            className={cn(
              "flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="size-4" aria-hidden />
            <span className={cn(compact && "sr-only")}>{o.short}</span>
          </button>
        );
      })}
    </div>
  );
}

import { Film } from "lucide-react";

import { toBnDigits } from "@/lib/domain/labels";
import { parseCodeSpecTimeline } from "@/lib/domain/prompts";

/** Structural storyboard of the spec. Not a rendered video — no renderer is connected. */
export function CodePreview({ spec }: { spec: string }) {
  const beats = parseCodeSpecTimeline(spec);
  const total = beats.reduce((s, b) => s + (b.durationSec ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className="film-grain grid aspect-video place-items-center rounded-xl border border-dashed border-border bg-surface p-4 text-center">
        <div>
          <Film className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-medium text-foreground">রেন্ডার প্রিভিউ এখানে দেখাবে</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            কোড-রেন্ডার সার্ভিস সংযুক্ত নয়, তাই কোনো ভিডিও তৈরি হয়নি। নিচে আপনার স্পেকের টাইমলাইন দেখানো হলো।
          </p>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">স্পেক টাইমলাইন</span>
          <span className="text-muted-foreground">
            {toBnDigits(beats.length)} বিট{total > 0 && ` · ${toBnDigits(total)} সেকেন্ড`}
          </span>
        </div>
        {beats.length === 0 ? (
          <p className="text-sm text-muted-foreground">স্পেক এডিটরে প্রতি লাইনে একটি বিট লিখুন।</p>
        ) : (
          <ol className="space-y-1.5">
            {beats.map((b) => (
              <li key={b.index} className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
                <span className="font-display text-primary">{toBnDigits(b.index + 1)}</span>
                <span className="flex-1 break-words text-foreground/90">{b.label}</span>
                {b.durationSec !== null && (
                  <span className="shrink-0 text-xs text-muted-foreground">{toBnDigits(b.durationSec)}সে</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { PlugZap } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

/** Honest notice that a capability needs a real provider before it can run. */
export function NotConnectedNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside
      role="note"
      className="rounded-xl border border-status-waiting/35 bg-status-waiting/[0.07] p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <PlugZap className="size-4 text-status-waiting" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Badge variant="warning">সংযুক্ত নয়</Badge>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      <Link
        to="/settings"
        className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        সংযোগের প্রয়োজনীয়তা দেখুন →
      </Link>
    </aside>
  );
}

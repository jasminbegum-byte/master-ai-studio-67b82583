import { useHydrated } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/** Locally stored data only exists in the browser; show a skeleton until hydrated. */
export function HydrationGate({ children, rows = 3 }: { children: ReactNode; rows?: number }) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="লোড হচ্ছে">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  return <>{children}</>;
}

import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV, NAV_ITEMS, type NavItem } from "./nav-items";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-lg bg-[image:var(--gradient-primary)] font-display text-lg font-bold text-primary-foreground shadow-glow"
      >
        ম
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-semibold text-foreground">
          Master AI Studio
        </span>
        <span className="block text-xs text-muted-foreground">ক্রিয়েটর প্রোডাকশন ডেস্ক</span>
      </span>
    </Link>
  );
}

function useIsActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: NavItem["to"]) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <nav aria-label="প্রধান নেভিগেশন" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon
              className={cn("size-[1.15rem] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
            />
            <span>{item.label}</span>
            {active && <span aria-hidden className="ml-auto h-5 w-1 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}

function FreeFirstNote() {
  return (
    <p className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs leading-relaxed text-muted-foreground">
      ফ্রি-ফার্স্ট নীতি: আপনার স্পষ্ট অনুমতি ছাড়া কোনো পেইড সার্ভিস, ক্লাউড ডেটাবেস বা প্রকাশ চালু হবে না।
    </p>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  const bottomItems = NAV_ITEMS.filter((i) => BOTTOM_NAV.includes(i.to));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        মূল কনটেন্টে যান
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-sidebar-border bg-sidebar/90 p-4 backdrop-blur lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <FreeFirstNote />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="সব বিভাগ খুলুন"
            className="grid size-11 place-items-center rounded-lg border border-border bg-surface-raised text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[84vw] max-w-xs flex-col gap-5 border-sidebar-border bg-sidebar p-4">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display">সব বিভাগ</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <FreeFirstNote />
          </SheetContent>
        </Sheet>
      </header>

      <main id="main" className="min-w-0 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="দ্রুত নেভিগেশন"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 px-2 pt-1.5 backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {bottomItems.map((item) => {
            const active = isActive(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.7rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.short}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-[0.7rem] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Menu className="size-5" />
              আরও
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

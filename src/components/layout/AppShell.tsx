import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ModeSwitch } from "@/components/workspace/ModeSwitch";
import { setSidebarCollapsed, useSidebarCollapsed, useWorkspaceMode } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV, NAV_ITEMS, type NavItem } from "./nav-items";

function Brand({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <Link to="/" aria-label="Master AI Studio ড্যাশবোর্ড" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)] font-display text-lg font-bold text-primary-foreground shadow-glow"
      >
        ম
      </span>
      {!iconOnly && (
        <span className="leading-tight">
          <span className="block font-display text-base font-semibold text-foreground">Master AI Studio</span>
          <span className="block text-xs text-muted-foreground">ক্রিয়েটর প্রোডাকশন ডেস্ক</span>
        </span>
      )}
    </Link>
  );
}

function useIsActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: NavItem["to"]) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
}

function NavList({ onNavigate, iconOnly = false }: { onNavigate?: () => void; iconOnly?: boolean }) {
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
            aria-label={iconOnly ? item.label : undefined}
            title={iconOnly ? item.label : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              iconOnly && "justify-center px-0",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className={cn("size-[1.15rem] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            {!iconOnly && <span>{item.label}</span>}
            {active && !iconOnly && <span aria-hidden className="ml-auto h-5 w-1 rounded-full bg-primary" />}
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

/**
 * Layout per workspace mode. Before hydration (mode === null) the original
 * responsive layout renders; afterwards the chosen mode wins on any screen size.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  const { mode } = useWorkspaceMode();
  const collapsed = useSidebarCollapsed();
  const bottomItems = NAV_ITEMS.filter((i) => BOTTOM_NAV.includes(i.to));
  const computer = mode === "computer";
  const mobile = mode === "mobile";
  const toggleSidebar = () => {
    try {
      setSidebarCollapsed(!collapsed);
    } catch {
      /* storage unavailable: ignore */
    }
  };

  // Computer mode: Ctrl/⌘ + B collapses the sidebar.
  useEffect(() => {
    if (!computer) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const sidebarVisible = computer ? "flex" : mobile ? "hidden" : "hidden lg:flex";
  const mobileChrome = computer ? "hidden" : mobile ? "" : "lg:hidden";

  return (
    <div
      data-workspace-mode={mode ?? "responsive"}
      className={cn(
        "min-h-dvh",
        computer
          ? collapsed
            ? "grid grid-cols-[4.25rem_1fr]"
            : "grid grid-cols-[4.25rem_1fr] md:grid-cols-[16rem_1fr]"
          : mobile
            ? ""
            : "lg:grid lg:grid-cols-[17rem_1fr]",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        মূল কনটেন্টে যান
      </a>

      <aside
        aria-label="সাইডবার"
        className={cn("sticky top-0 h-dvh flex-col gap-5 border-r border-sidebar-border bg-sidebar/90 p-3 backdrop-blur md:p-4", sidebarVisible)}
      >
        {computer ? (
          <>
            <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between max-md:flex-col")}>
              <span className={cn(!collapsed && "max-md:hidden")}><Brand iconOnly={collapsed} /></span>
              {!collapsed && <span className="md:hidden"><Brand iconOnly /></span>}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? "সাইডবার খুলুন (Ctrl+B)" : "সাইডবার ছোট করুন (Ctrl+B)"}
                aria-expanded={!collapsed}
                title="Ctrl+B"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:hidden"
              >
                {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <span className={cn(collapsed ? "hidden" : "max-md:hidden")}><NavList /></span>
              <span className={cn(collapsed ? "" : "md:hidden")}><NavList iconOnly /></span>
            </div>
            {!collapsed && (
              <div className="space-y-3 max-md:hidden">
                <ModeSwitch className="w-full justify-between" />
                <FreeFirstNote />
              </div>
            )}
            <div className={cn(collapsed ? "" : "md:hidden")}><ModeSwitch compact className="flex-col" /></div>
          </>
        ) : (
          <>
            <Brand />
            <div className="flex-1 overflow-y-auto"><NavList /></div>
            <ModeSwitch className="w-full justify-between" />
            <FreeFirstNote />
          </>
        )}
      </aside>

      <header className={cn("sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur", mobileChrome)}>
        <Brand iconOnly />
        <ModeSwitch compact />
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
            <ModeSwitch className="w-full justify-between" />
            <FreeFirstNote />
          </SheetContent>
        </Sheet>
      </header>

      <main
        id="main"
        className={cn(
          "min-w-0 px-4 pt-5",
          computer ? "pb-12 sm:px-6 lg:px-8 lg:pt-8" : mobile ? "pb-28" : "pb-28 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8",
        )}
      >
        <div className={cn("mx-auto w-full", computer ? "max-w-7xl" : mobile ? "max-w-2xl" : "max-w-6xl")}>{children}</div>
      </main>

      <nav
        aria-label="দ্রুত নেভিগেশন"
        className={cn("safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 px-2 pt-1.5 backdrop-blur", mobileChrome)}
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
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

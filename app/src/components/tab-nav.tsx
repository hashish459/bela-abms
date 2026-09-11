"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { title: string; href: string };

/** Horizontal, scrollable tab strip. Active state from the current path. */
export function TabNav({ tabs, exact = true }: { tabs: Tab[]; exact?: boolean }) {
  const pathname = usePathname();
  return (
    <div data-app-chrome className="overflow-x-auto">
      <nav className="flex w-max gap-1 rounded-xl border border-border bg-surface p-1">
        {tabs.map((t) => {
          const active = exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-accent-tint font-semibold text-accent"
                  : "text-muted hover:bg-accent-tint hover:text-foreground"
              }`}
            >
              {t.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

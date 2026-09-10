"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SettingsTab = { title: string; href: string };

export function SettingsNav({ tabs }: { tabs: SettingsTab[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 lg:w-56 lg:flex-col lg:overflow-visible">
      {tabs.map((t) => {
        const active = pathname === t.href;
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
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

export type ReportEntry = {
  title: string;
  href: string | null; // null = not yet available
  gapReason?: string; // shown when href is null
};
export type ReportGroup = {
  key: string;
  name: string;
  reports: ReportEntry[];
};

const FAVOURITES_KEY = "bela.reports.favourites";

function loadFavourites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function ReportsCatalogue({ groups }: { groups: ReportGroup[] }) {
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setFavourites(loadFavourites());
      setLoaded(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function toggleFavourite(href: string) {
    setFavourites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      try {
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
      } catch {
        // best-effort only — favourites are a per-browser convenience, not data
      }
      return next;
    });
  }

  const allReports = groups.flatMap((g) => g.reports.map((r) => ({ ...r, group: g.name })));
  const favouriteReports = loaded ? allReports.filter((r) => r.href && favourites.includes(r.href)) : [];

  return (
    <>
      <PageHeader crumbs={["Reports"]} title="Reports" />
      <p className="mb-5 text-sm text-muted">
        Every report zooms into its source vouchers — click any row in a report to see the
        transaction behind it. Star a report to pin it to Favourites.
      </p>

      {favouriteReports.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Favourites</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {favouriteReports.map((r) => (
              <ReportCard key={r.href} entry={r} isFavourite onToggleFavourite={toggleFavourite} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.key}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.name}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.reports.map((r) => (
                <ReportCard
                  key={r.title}
                  entry={r}
                  isFavourite={!!r.href && favourites.includes(r.href)}
                  onToggleFavourite={toggleFavourite}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ReportCard({
  entry,
  isFavourite,
  onToggleFavourite,
}: {
  entry: ReportEntry;
  isFavourite: boolean;
  onToggleFavourite: (href: string) => void;
}) {
  const body = (
    <Card className={`flex items-center justify-between gap-2 p-3 ${entry.href ? "transition-colors hover:bg-accent-tint" : "opacity-60"}`}>
      <div>
        <div className="text-sm font-medium">{entry.title}</div>
        {!entry.href && entry.gapReason && <div className="mt-0.5 text-xs text-muted">{entry.gapReason}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {entry.href && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavourite(entry.href!);
            }}
            className="rounded p-1 text-muted hover:text-accent"
            aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
          >
            <Star size={14} fill={isFavourite ? "currentColor" : "none"} className={isFavourite ? "text-accent" : ""} />
          </button>
        )}
        {entry.href && <ArrowRight size={14} className="text-muted" />}
      </div>
    </Card>
  );
  return entry.href ? <Link href={entry.href}>{body}</Link> : <div title={entry.gapReason}>{body}</div>;
}

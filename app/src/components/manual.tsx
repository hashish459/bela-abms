import { Card } from "@/components/ui";

export function ManualIntro({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted">{children}</p>;
}

export function ManualSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function KeyConcepts({ items }: { items: { term: string; def: string }[] }) {
  return (
    <Card className="grid gap-3 p-4 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.term}>
          <p className="text-sm font-semibold">{it.term}</p>
          <p className="text-sm text-muted">{it.def}</p>
        </div>
      ))}
    </Card>
  );
}

/** Horizontal step-flow diagram: Box -> Box -> Box, wraps on narrow screens. */
export function FlowSteps({ steps }: { steps: { title: string; desc?: string; note?: string }[] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 overflow-x-auto py-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-stretch gap-2">
          <div className="flex min-w-40 flex-col justify-center rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold">{s.title}</p>
            {s.desc && <p className="mt-0.5 text-xs text-muted">{s.desc}</p>}
            {s.note && <p className="mt-1 text-[11px] font-medium text-accent">{s.note}</p>}
          </div>
          {i < steps.length - 1 && (
            <div className="flex items-center px-1 text-lg text-muted" aria-hidden>
              →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ExampleBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-accent/30 bg-accent-tint/40 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Worked Example — {title}</p>
      <div className="space-y-2 text-sm">{children}</div>
    </Card>
  );
}

export function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-accent bg-accent-tint/30 px-4 py-2.5 text-sm">
      💡 {children}
    </div>
  );
}

export function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-danger bg-danger/5 px-4 py-2.5 text-sm">
      ⚠ {children}
    </div>
  );
}

/** Simple T-account diagram: Debit on the left, Credit on the right. */
export function TAccountDiagram({
  title,
  debit,
  credit,
}: {
  title: string;
  debit: string[];
  credit: string[];
}) {
  return (
    <svg viewBox="0 0 360 160" className="mx-auto w-full max-w-md" role="img" aria-label={`T-account for ${title}`}>
      <text x="180" y="18" textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
        {title}
      </text>
      <line x1="180" y1="26" x2="180" y2="150" stroke="currentColor" className="text-border" strokeWidth="1.5" />
      <line x1="10" y1="26" x2="350" y2="26" stroke="currentColor" className="text-border" strokeWidth="1.5" />
      <text x="90" y="42" textAnchor="middle" className="fill-muted text-[11px] font-medium">
        Debit (Dr)
      </text>
      <text x="270" y="42" textAnchor="middle" className="fill-muted text-[11px] font-medium">
        Credit (Cr)
      </text>
      {debit.map((line, i) => (
        <text key={i} x="20" y={62 + i * 18} className="fill-foreground text-[11px]">
          {line}
        </text>
      ))}
      {credit.map((line, i) => (
        <text key={i} x="190" y={62 + i * 18} className="fill-foreground text-[11px]">
          {line}
        </text>
      ))}
    </svg>
  );
}

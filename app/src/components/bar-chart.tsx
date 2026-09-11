/** Minimal dependency-free bar chart for a daily amount trend. */
export function BarChart({ points }: { points: { date: string; amount: number }[] }) {
  const max = Math.max(1, ...points.map((p) => Math.abs(p.amount)));
  const w = 720;
  const h = 140;
  const barGap = 2;
  const barW = points.length ? w / points.length - barGap : 0;

  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full" role="img" aria-label="Daily sales trend">
      <line x1="0" y1={h} x2={w} y2={h} stroke="currentColor" className="text-border" strokeWidth="1" />
      {points.map((p, i) => {
        const barH = max > 0 ? (Math.abs(p.amount) / max) * (h - 4) : 0;
        const x = i * (barW + barGap);
        const isLast = i === points.length - 1;
        return (
          <g key={p.date}>
            <rect
              x={x}
              y={h - barH}
              width={Math.max(barW, 1)}
              height={barH}
              rx={1.5}
              className={p.amount < 0 ? "fill-danger/60" : isLast ? "fill-accent" : "fill-accent/50"}
            >
              <title>{`${p.date}: Rs. ${p.amount.toLocaleString("en-US")}`}</title>
            </rect>
          </g>
        );
      })}
      {points.length > 0 && (
        <>
          <text x="0" y={h + 16} className="fill-muted text-[10px]">
            {points[0].date}
          </text>
          <text x={w} y={h + 16} textAnchor="end" className="fill-muted text-[10px]">
            {points[points.length - 1].date}
          </text>
        </>
      )}
    </svg>
  );
}

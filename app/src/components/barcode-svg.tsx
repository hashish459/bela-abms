import { encodeCode128B, encodeEAN13 } from "@/lib/barcode";

/** Code128B or EAN13 barcode rendered as native SVG rects (not a raw string
 * blob) — the component both the products list and the printable label page
 * use. */
export function BarcodeSvg({
  value,
  symbology = "CODE128",
  height = 60,
  showText = true,
}: {
  value: string;
  symbology?: string;
  height?: number;
  showText?: boolean;
}) {
  const widths = symbology === "EAN13" ? encodeEAN13(value) : encodeCode128B(value);
  const quiet = 10;
  const totalModules = widths.reduce((a, w) => a + w, 0);
  const totalWidth = totalModules + quiet * 2;
  const textHeight = showText ? 14 : 0;

  let x = quiet;
  let bar = true;
  const rects: { x: number; w: number }[] = [];
  for (const w of widths) {
    if (bar) rects.push({ x, w });
    x += w;
    bar = !bar;
  }

  return (
    <svg viewBox={`0 0 ${totalWidth} ${height + textHeight}`} width="100%" height={height + textHeight} role="img" aria-label={`Barcode ${value}`}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={height} fill="#000" />
      ))}
      {showText && (
        <text x={totalWidth / 2} y={height + 11} textAnchor="middle" fontFamily="monospace" fontSize={10} fill="#000">
          {value}
        </text>
      )}
    </svg>
  );
}

import NepaliDate from "nepali-date-converter";

/**
 * Bikram Sambat ⇆ Gregorian (AD) conversion.
 *
 * Storage & API: always AD (ISO `YYYY-MM-DD`). Display: BS.
 * The reference app shows BS in the UI but sends AD (`from_date=2026-07-17`) to its API —
 * we do the same.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** AD `Date` (or ISO string) → BS `YYYY-MM-DD`. */
export function adToBs(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const n = new NepaliDate(d);
  // NepaliDate months are 0-indexed.
  return `${n.getYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

/** BS `YYYY-MM-DD` (or y,m,d) → AD `Date` (UTC midnight). */
export function bsToAd(bs: string): Date {
  const [y, m, d] = bs.split("-").map(Number);
  const n = new NepaliDate(y, (m ?? 1) - 1, d ?? 1);
  const ad = n.toJsDate();
  return new Date(Date.UTC(ad.getFullYear(), ad.getMonth(), ad.getDate()));
}

/** AD `Date`/ISO → ISO date string `YYYY-MM-DD` (no time). */
export function toIsoDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** BS label for a fiscal-year style range, e.g. "17/07/2026 – 16/07/2027" in AD. */
export function formatAdRange(start: Date | string, end: Date | string): string {
  const f = (x: Date | string) => {
    const d = typeof x === "string" ? new Date(x) : x;
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  };
  return `${f(start)} – ${f(end)}`;
}

export const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

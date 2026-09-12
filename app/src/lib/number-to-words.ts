/**
 * Rupees-and-paisa amount in words, Indian/Nepali numbering (thousand, lakh,
 * crore — not the international million/billion grouping), e.g. 1234567.50
 * → "Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and
 * Fifty Paisa Only". Standard convention on a Nepali tax invoice, absent
 * from this app's print output until now.
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** Whole-number part in Indian/Nepali grouping: crore, lakh, thousand, hundred. */
function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ");
}

export function amountInWords(amount: number | string): string {
  const value = Math.abs(Number(String(amount).replace(/,/g, "")) || 0);
  const rupees = Math.floor(value);
  const paisa = Math.round((value - rupees) * 100);

  const rupeeWords = integerToWords(rupees);
  const paisaWords = paisa > 0 ? ` and ${twoDigits(paisa)} Paisa` : "";
  return `Rupees ${rupeeWords}${paisaWords} Only`;
}

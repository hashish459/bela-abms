/**
 * Code 128 (subset B) encoder — pure JS, no dependency. Subset B covers ASCII
 * 32-127 (space through DEL), which is every character a SKU/prefix+number
 * value would ever use. Table is the standard ISO/IEC 15417 Code 128 pattern
 * set (character value -> six bar/space widths in modules; each row sums to
 * 11 except the 7-element STOP pattern, which sums to 13) — the same table
 * every Code 128 implementation (barcode scanners included) is built from.
 */

// prettier-ignore
const PATTERNS: number[][] = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
  [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
  [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
  [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
  [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
  [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
  [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
  [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
  [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
  [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
  [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
  [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
  [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
  [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
  [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
  [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
  [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
  [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
  [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],
  [2,1,1,4,1,2], // 103 START A
  [2,1,1,2,1,4], // 104 START B
  [2,1,1,2,3,2], // 105 START C
];
const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2];
const START_B = 104;
const STOP = 106;

/** Widths (in modules) of alternating bar/space elements, starting with a bar. */
export function encodeCode128B(text: string): number[] {
  const codes: number[] = [START_B];
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 32;
    if (code < 0 || code > 95) throw new Error(`Code128B cannot encode character "${ch}"`);
    codes.push(code);
  }
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) checksum += codes[i] * i;
  codes.push(checksum % 103);
  codes.push(STOP);

  const widths: number[] = [];
  for (const code of codes) {
    widths.push(...(code === STOP ? STOP_PATTERN : PATTERNS[code]));
  }
  return widths;
}

/**
 * EAN-13 encoder — pure JS, no dependency. Standard GS1 tables: each of the
 * left six digits is encoded as an "L" (odd parity) or "G" (even parity)
 * 7-module pattern depending on the first digit's parity-pattern row; the
 * right six digits always use the "R" (complement of L) pattern. Guard bars
 * (start/center/end) plus these patterns concatenate into one continuous
 * 95-module bit string, which is then run-length encoded the same way
 * Code128's pattern table already is (a flat width array, first run always a
 * bar, since EAN-13's start guard "101" begins with a bar module).
 */

// prettier-ignore
const L_CODE = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
];
// prettier-ignore
const G_CODE = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111",
];
// prettier-ignore
const R_CODE = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100",
];
/** Which of L/G each of the left six digits uses, keyed by the first digit. */
const PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
];

/** GS1 mod-10 check digit for the first 12 digits of an EAN-13 value. */
export function ean13CheckDigit(digits12: string): number {
  if (!/^\d{12}$/.test(digits12)) throw new Error("EAN13 check digit needs exactly 12 digits");
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (digits12.charCodeAt(i) - 48) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/** Widths (in modules) of alternating bar/space elements, starting with a bar. */
export function encodeEAN13(value: string): number[] {
  if (!/^\d{13}$/.test(value)) throw new Error("EAN13 requires exactly 13 numeric digits");
  const digits = value.split("").map(Number);
  if (ean13CheckDigit(value.slice(0, 12)) !== digits[12]) throw new Error("EAN13 check digit is invalid");

  const parity = PARITY[digits[0]];
  let bits = "101";
  for (let i = 0; i < 6; i++) bits += (parity[i] === "L" ? L_CODE : G_CODE)[digits[i + 1]];
  bits += "01010";
  for (let i = 0; i < 6; i++) bits += R_CODE[digits[i + 7]];
  bits += "101";

  const widths: number[] = [];
  let i = 0;
  while (i < bits.length) {
    let j = i;
    while (j < bits.length && bits[j] === bits[i]) j++;
    widths.push(j - i);
    i = j;
  }
  return widths;
}

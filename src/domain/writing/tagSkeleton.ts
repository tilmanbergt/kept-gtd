/**
 * How two tags can be the same tag written differently by handwriting
 * recognition (docs/dev/history/technical-design-writing-help.md §1.2). Pure.
 *
 * - Rule A, `tagSkeleton`: letters recognition confuses fold to one
 *   character, so `#DaiIy` and `#daily` (both `da11y`), `#1o1` and `#101`
 *   share a skeleton.
 * - Rule B, `oneStepOff`: one character added, missing or changed, or two
 *   neighbours swapped - only for tags of at least `ONE_STEP_MIN_LENGTH`.
 * - Rule P, `pluralMatch`: a German or English plural ending more or less.
 *
 * Case is never a difference: every rule compares lowercased forms.
 */

/** Rule B applies only to tags at least this long - shorter ones are one step from too many others. */
export const ONE_STEP_MIN_LENGTH = 4;

/** Two-letter shapes, read before the single letters, so `cl` becomes `d` before `l` becomes `1`. */
const PAIRS: Readonly<Record<string, string>> = {rn: 'm', cl: 'd', vv: 'w'};

const SINGLE: Readonly<Record<string, string>> = {
  l: '1',
  i: '1',
  '|': '1',
  '!': '1',
  o: '0',
  s: '5',
  z: '2',
  g: '9',
  q: '9',
  b: '6',
  ä: 'a',
  // ö folds to o, and o on to 0.
  ö: '0',
  ü: 'u',
  ß: '55',
};

/** The handwriting skeleton of `tag` (Rule A): `B` -> `8` before lowercasing, then the folding table, in one pass. */
export function tagSkeleton(tag: string): string {
  const lower = tag.toLowerCase();
  let out = '';
  for (let i = 0; i < lower.length; i++) {
    if (tag[i] === 'B') {
      out += '8';
      continue;
    }
    const pair = i + 1 < lower.length ? PAIRS[lower[i] + lower[i + 1]] : undefined;
    if (pair) {
      out += pair;
      i++;
      continue;
    }
    const ch = lower[i];
    out += SINGLE[ch] ?? ch;
  }
  return out;
}

/**
 * Whether `a` and `b` are exactly one edit apart (Rule B): one character
 * inserted, deleted or replaced, or two neighbours swapped. Equal strings are
 * not one step off.
 */
export function oneStepOff(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let first = -1;
    let diffs = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) {
        if (first < 0) first = i;
        diffs += 1;
        if (diffs > 2) return false;
      }
    }
    if (diffs === 1) return true;
    // Two differences: only a swap of neighbours counts.
    return diffs === 2 && first + 1 < la && a[first] === b[first + 1] && a[first + 1] === b[first] && a.slice(first + 2) === b.slice(first + 2);
  }
  const [short, long] = la < lb ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.slice(i) === long.slice(i + 1);
}

/** The plural endings Rule P knows: `#retros`, `#workshope`, `#fragen`, `#kinder`. */
export const PLURAL_ENDINGS: readonly string[] = ['s', 'e', 'n', 'en', 'er'];

/** Whether one of `a`, `b` is the other plus a plural ending (Rule P), compared lowercased. */
export function pluralMatch(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return false;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  if (!short || !long.startsWith(short)) return false;
  return PLURAL_ENDINGS.includes(long.slice(short.length));
}

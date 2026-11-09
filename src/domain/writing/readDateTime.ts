/**
 * Reading a date or time that handwriting recognition wrote
 * (docs/dev/history/technical-design-writing-help.md §1.6). Pure.
 *
 * Look-alike letters fold to digits, separators are unified, then every
 * reading is checked by the parsers Quick Add saves with
 * (domain/meetingTime.ts `parseMeetingWhen`, domain/dateNudge.ts
 * `isValidIsoDate`) - this module wraps them and never decides on its own
 * what a valid time or date is.
 *
 * - `ok`: the field already holds a valid value (`value` = what it means);
 * - `read`: exactly one valid reading, different from what is written;
 * - `choice`: two readings, the more likely first;
 * - `none`: no reading - Add shows the parser's error as before.
 */
import {isValidIsoDate} from '../dateNudge';
import {formatMeetingWhen, parseMeetingWhen} from '../meetingTime';

export type Reading = {kind: 'ok'; value: string} | {kind: 'read'; value: string} | {kind: 'choice'; values: string[]} | {kind: 'none'};

const DIGIT_FOLD: Readonly<Record<string, string>> = {
  O: '0',
  o: '0',
  l: '1',
  I: '1',
  i: '1',
  '|': '1',
  S: '5',
  s: '5',
  Z: '2',
  z: '2',
  B: '8',
  g: '9',
  q: '9',
  b: '6',
};

/** The look-alike letters of a date or time field as digits (`l5,3O` -> `15,30`); other characters stay. */
export function foldDigits(text: string): string {
  let out = '';
  for (const ch of text) out += DIGIT_FOLD[ch] ?? ch;
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The readings of one time of a range, more likely first; null when it is no time at all. */
function partReadings(part: string): {values: string[]; bareShort: boolean} | null {
  const bare = /^(\d{1,2})$/.exec(part);
  if (bare) {
    const hour = Number(bare[1]);
    // An hour 1-6 without minutes is more often the afternoon (§1.6).
    if (hour >= 1 && hour <= 6) return {values: [`${pad(hour + 12)}:00`, `${pad(hour)}:00`], bareShort: true};
    return {values: [`${pad(hour)}:00`], bareShort: false};
  }
  const split = /^(\d{1,2})\s*[:.,;' ]\s*(\d{1,2})$/.exec(part);
  if (split) {
    const hour = pad(Number(split[1]));
    // `15,3`: 15:30 or 15:03 (§1.6, C3).
    if (split[2].length === 1) return {values: [`${hour}:${split[2]}0`, `${hour}:0${split[2]}`], bareShort: false};
    return {values: [`${hour}:${split[2]}`], bareShort: false};
  }
  const joined = /^(\d{1,2})(\d{2})$/.exec(part);
  if (joined) return {values: [`${pad(Number(joined[1]))}:${joined[2]}`], bareShort: false};
  return null;
}

/** The candidate field texts for `text`, more likely first. */
function timeCandidates(text: string): string[] {
  const parts = text.split('-').map(p => p.trim());
  if (parts.length > 2 || parts.some(p => !p)) return [];
  const readings = parts.map(partReadings);
  if (readings.some(r => r === null)) return [];
  const [start, end] = readings as Array<{values: string[]; bareShort: boolean}>;
  if (!end) return start.values;
  // `3-4`: both afternoon, or both as written - never one of each.
  if (start.bareShort && end.bareShort) return start.values.map((s, i) => `${s}-${end.values[i]}`);
  const out: string[] = [];
  for (const s of start.values) for (const e of end.values) out.push(`${s}-${e}`);
  return out;
}

/** The meeting time field (§1.6 "Times"; `bis` dropped, §10.4): `15,30`, `15 30`, `1530`, `930`, `15h`, `l5,3O-l6`, `3-4`, `15,3`, `g`. */
export function readTime(text: string): Reading {
  const trimmed = text.trim();
  const written = parseMeetingWhen(trimmed);
  if (!trimmed || /^\d+\s*d$/i.test(trimmed)) return written.ok ? {kind: 'ok', value: formatMeetingWhen(written.value)} : {kind: 'none'};
  const unified = foldDigits(trimmed.replace(/\s*[–—]\s*/g, '-').replace(/(\d)\s*h\b/gi, '$1'));
  const valid: string[] = [];
  for (const candidate of timeCandidates(unified.replace(/\s*-\s*/g, '-'))) {
    const parsed = parseMeetingWhen(candidate);
    if (!parsed.ok) continue;
    const value = formatMeetingWhen(parsed.value);
    if (!valid.includes(value)) valid.push(value);
  }
  if (valid.length === 0) return written.ok ? {kind: 'ok', value: formatMeetingWhen(written.value)} : {kind: 'none'};
  if (valid.length > 1) return {kind: 'choice', values: valid.slice(0, 2)};
  const value = valid[0];
  return written.ok && formatMeetingWhen(written.value) === value ? {kind: 'ok', value} : {kind: 'read', value};
}

function isoOf(year: number, month: number, day: number): string | null {
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isValidIsoDate(iso) ? iso : null;
}

/** Day and month in that order, else swapped (`11.13` -> 13 Nov): only one order can be valid then. */
function dayMonth(a: number, b: number, year: number): string | null {
  return isoOf(year, b, a) ?? isoOf(year, a, b);
}

/** The next date on or after `today` with that day and month. */
function nextDayMonth(a: number, b: number, today: string): string | null {
  const year = Number(today.slice(0, 4));
  const thisYear = dayMonth(a, b, year);
  if (thisYear && thisYear >= today) return thisYear;
  return dayMonth(a, b, year + 1) ?? thisYear;
}

/** The one date `text` can mean, or null. */
function dateOf(text: string, today: string): string | null {
  const s = foldDigits(text)
    .replace(/[\s,;'/-]+/g, '.')
    .replace(/\.{2,}/g, '.');
  let m = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(s) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) {
    const [y, a, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isoOf(y, a, b) ?? isoOf(y, b, a);
  }
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return dayMonth(Number(m[1]), Number(m[2]), year);
  }
  m = /^(\d{1,2})\.(\d{1,2})\.?$/.exec(s);
  if (m) return nextDayMonth(Number(m[1]), Number(m[2]), today);
  return null;
}

/**
 * A date field (§1.6 "Dates"): `9.11.2026`, `09.11.26`, `9.11.`, `9.11` (the
 * next 9 November), `2026 11 09`, `2026.11.09`, `20261109`, look-alike
 * letters folded. `today` is YYYY-MM-DD.
 */
export function readDate(text: string, today: string): Reading {
  const trimmed = text.trim();
  if (!trimmed || isValidIsoDate(trimmed)) return {kind: 'ok', value: trimmed};
  const value = dateOf(trimmed, today);
  return value ? {kind: 'read', value} : {kind: 'none'};
}

/**
 * Whether `text` holds a character a date (or time) field can't mean as
 * written - a look-alike letter like `g` for 9 (§10.4). Digits, the
 * separators, `-`, `–` and, in a time field, the `d` of `2d` and the `h` of
 * `15h` are what such a field may hold.
 */
export function hasLookAlike(field: 'date' | 'time', text: string): boolean {
  return field === 'time' ? /[^\d\s:.,;'\-–—dhDH]/.test(text) : /[^\d\s.,;'\-–—/]/.test(text);
}

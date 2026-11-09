/**
 * What the writing help's strip shows (docs/dev/history/technical-design-writing-help.md
 * §3.3): one thing at a time, the first that applies. Pure: the hook
 * (ui/writing/useWritingHelp.ts) keeps the state, this decides and labels.
 *
 * 1. `fixes` - up to two flagged tags, in text order: `→ #x` each, Keep, Edit ›;
 * 2. `read` - a learned fix or a date/time read just applied: "read as …" + Undo;
 * 3. `choice` - a date or time with two readings;
 * 4. `complete` - up to three completions + Edit ›;
 * 5. `feedback` - where the page goes, or "New tag …";
 * 6. a date field: the full date (+ warning), the nudges, and the usual date
 *    of the meeting's series; a time field: the read time and length
 *    (+ warning), or the series' usual time while empty - each strip fills only
 *    its own field;
 * 7. a text field: All · Copy · Cut · Paste.
 *
 * States 2-5 are a *moment*: the hook ends one on the next touch in the field,
 * on the next focus, or on the next burst - never by a timer.
 */
import {formatFullDate, formatLength, formatTime, formatTimeSpan} from '../dateFormat';
import {isValidIsoDate} from '../dateNudge';
import {parseMeetingWhen} from '../meetingTime';
import {KnownTag} from './knownTags';
import {UsualSlot} from './meetingHints';

export type StripField = 'text' | 'date' | 'time';

/** A flagged tag waiting for an answer: as written, and the suggestion (both without `#`). */
export interface PendingFix {
  written: string;
  suggestion: string;
}

/** One of two readings of a date or time: the field text it writes, and its label. */
export interface ChoiceOption {
  value: string;
  label: string;
}

/** A state that lasts until the next touch (2-5 above). */
export type StripMoment =
  | {kind: 'read'; label: string}
  | {kind: 'choice'; options: ChoiceOption[]}
  | {kind: 'complete'; options: KnownTag[]}
  | {kind: 'feedback'; text: string};

export type StripContent =
  | {kind: 'fixes'; fixes: PendingFix[]}
  | StripMoment
  | {kind: 'date'; label: string | null; warning: string | null; usual: string | null}
  | {kind: 'time'; label: string; warning: string | null}
  | {kind: 'usual'; usual: string}
  | {kind: 'clipboard'}
  | {kind: 'none'};

export interface StripState {
  field: StripField;
  /** The field's text. */
  value: string;
  /** Unanswered flagged tags, at most two, in text order. */
  fixes: readonly PendingFix[];
  moment: StripMoment | null;
  /** Edit › was tapped: the clipboard buttons instead of fixes or completions. */
  showClipboard: boolean;
  /** Past or overlap, for a meeting's date and time strips. */
  warning?: string | null;
  /**
   * The usual slot of the meeting's series. The date strip offers its date
   * (unless the field holds it), the time strip its time and end while empty.
   */
  usual?: UsualSlot | null;
}

/** The most fixes the strip shows at once (§1.4). */
export const MAX_SHOWN_FIXES = 2;

/** `Tue 17 Nov` - the usual date's button on the date strip. */
export function usualDateLabel(slot: UsualSlot): string {
  return formatFullDate(slot.date, false);
}

/** `14:00 – 14:45 · 45 min` - the usual time's button on the time strip. */
export function usualTimeLabel(slot: UsualSlot): string {
  return `${formatTimeSpan(slot.time, slot.endTime)} · ${formatLength(slot.minutes)}`;
}

/** What the usual time writes into the time field: `14:00-14:45`. */
export function usualTimeValue(slot: UsualSlot): string {
  return slot.endTime ? `${slot.time}-${slot.endTime}` : slot.time;
}

/** `15:30 – 16:00 · 30 min`, `15:30`, `2 days` - what a valid time field means; null when it means nothing. */
export function timeLabel(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = parseMeetingWhen(value);
  if (!parsed.ok) return null;
  const {time, endTime, days} = parsed.value;
  if (!time) return days === 1 ? '1 day' : `${days} days`;
  if (!endTime) return formatTimeSpan(time, '');
  const [sh, sm] = time.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return `${formatTimeSpan(time, endTime)} · ${formatLength(eh * 60 + em - (sh * 60 + sm))}`;
}

/** The one thing the strip shows - see the module doc comment. */
export function stripContent(state: StripState): StripContent {
  const {field, value, fixes, moment, showClipboard} = state;
  if (showClipboard && field === 'text') return {kind: 'clipboard'};
  if (fixes.length > 0) return {kind: 'fixes', fixes: fixes.slice(0, MAX_SHOWN_FIXES)};
  if (moment) return moment;
  const empty = !value.trim();
  if (field === 'date') {
    const label = isValidIsoDate(value.trim()) ? formatFullDate(value.trim()) : null;
    const usual = state.usual && state.usual.date !== value.trim() ? usualDateLabel(state.usual) : null;
    return {kind: 'date', label, warning: label ? state.warning ?? null : null, usual};
  }
  if (field === 'time') {
    if (empty) return state.usual ? {kind: 'usual', usual: usualTimeLabel(state.usual)} : {kind: 'none'};
    const label = timeLabel(value);
    return label ? {kind: 'time', label, warning: state.warning ?? null} : {kind: 'none'};
  }
  return {kind: 'clipboard'};
}

/** The feedback after a burst or a correction (§1.7): `✓ Daily · Meetings/Daily.note`, or `✓ Garden renovation 2026.note` for the Default. */
export function placeFeedback(setupName: string | null, file: string): string {
  return setupName ? `✓ ${setupName} · ${file}` : `✓ ${file}`;
}

/** A new tag with nothing close (§1.7, B3): `New tag #offsite27 · Team offsite 2026.note`. */
export function newTagFeedback(tag: string, file: string): string {
  return `New tag #${tag} · ${file}`;
}

/** The status-slot hint of the first + Add with unanswered fixes (§1.4). */
export function addAgainHint(fixes: readonly PendingFix[]): string {
  const tags = fixes.slice(0, MAX_SHOWN_FIXES).map(f => `#${f.written}`);
  return tags.length === 1 ? `Check ${tags[0]}, or Add again to keep it` : `Check ${tags.join(' and ')}, or Add again to keep them`;
}

/** `read as #daily`, `read as Mon 9 Nov 2026`, `read as 15:30 – 16:00 · 30 min`. */
export function readAsLabel(what: string): string {
  return `read as ${what}`;
}

/** The warning text for a meeting's strips: `past`, or `overlaps Jour Fixe 15:00`. */
export function overlapWarning(title: string, time: string): string {
  const short = title.length > OVERLAP_TITLE_MAX ? `${title.slice(0, OVERLAP_TITLE_MAX - 1).trimEnd()}…` : title;
  return `overlaps ${short} ${formatTime(time)}`;
}

/** The other meeting's title in the warning is cut to this many characters, so the strip stays one short line. */
export const OVERLAP_TITLE_MAX = 20;

export const PAST_WARNING = 'past';

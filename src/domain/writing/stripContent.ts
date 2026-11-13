/**
 * What the writing help's strip shows (docs/dev/history/technical-design-writing-help.md
 * §3.3): one thing at a time, the first that applies. Pure: the hook
 * (ui/writing/useWritingHelp.ts) keeps the state, this decides and labels.
 *
 * 1. `fixes` - up to two flagged tags, in text order: `→ #x` each, Keep, the clipboard square;
 * 2. `read` - a learned fix or a date/time read just applied: "read as …" + Undo;
 * 3. `choice` - a date or time with two readings;
 * 4. `complete` - up to three completions + the clipboard square;
 * 5. `feedback` - where the page goes (`#daily: Meetings/Daily 2026.note`);
 * 6. a date field: the full date (+ warning) and the nudges, and the usual
 *    slot while the time is empty; a time field: the read time and length (+ warning), or the
 *    usual slot when empty;
 * 7. an empty title field in create mode with `starters`: Thread · Loop ·
 *    Paste (docs/dev/history/technical-design-calmer-screens.md §3.3); a tap on
 *    Thread or Loop is the moment `starterList` (its setups' tags and ‹);
 * 8. a text field: All · Copy · Cut · Paste - or, in Quick Add's form
 *    (docs/dev/history/technical-design-quickadd-redesign.md §3.2), its resting
 *    view: `suggest` (📎 This file, the starters on an empty field, #next /
 *    #someday, recent tags, abbreviations) unless the view is `clipboard`.
 *
 * States 2-5 and the starter list are a *moment*: the hook ends one on the next touch in the field,
 * on the next focus, or on the next burst - never by a timer.
 */
import {formatFullDate, formatLength, formatTime, formatTimeSpan} from '../dateFormat';
import {isValidIsoDate} from '../dateNudge';
import {parseMeetingWhen} from '../meetingTime';
import {KnownTag} from './knownTags';
import {UsualSlot} from './meetingHints';
import {StarterOption} from './starters';

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
  | {kind: 'complete'; token: string; options: KnownTag[]}
  | {kind: 'feedback'; text: string}
  | {kind: 'starterList'; options: StarterOption[]};

/** What an empty title field offers (state 7); null where it offers none (edit mode, other fields). */
export interface StripStarters {
  thread: boolean;
  loop: boolean;
  paste: boolean;
}

/** One button of the Suggest view. */
export type SuggestOption = {kind: 'thisFile'} | {kind: 'tag'; tag: string};

/** The resting view of Quick Add's text strip. */
export type StripView = 'suggest' | 'clipboard';

export type StripContent =
  | {kind: 'fixes'; fixes: PendingFix[]}
  | {kind: 'suggest'; thread: boolean; loop: boolean; paste: boolean; options: SuggestOption[]}
  | StripMoment
  | {kind: 'date'; label: string | null; warning: string | null; usual: string | null}
  | {kind: 'time'; label: string; warning: string | null}
  | {kind: 'usual'; usual: string}
  | {kind: 'starters'; thread: boolean; loop: boolean; paste: boolean}
  | {kind: 'clipboard'}
  | {kind: 'none'};

export interface StripState {
  field: StripField;
  /** The field's text. */
  value: string;
  /** Unanswered flagged tags, at most two, in text order. */
  fixes: readonly PendingFix[];
  moment: StripMoment | null;
  /** The clipboard square was tapped: the clipboard buttons instead of fixes, completions or the place line. */
  showClipboard: boolean;
  /** Past or overlap, for a meeting's date and time strips. */
  warning?: string | null;
  /**
   * A meeting's usual slot. The time strip offers it while its field is empty;
   * the date strip whenever the caller passes it (while the time is still empty,
   * since the date field starts with today's date).
   */
  usual?: UsualSlot | null;
  /** An empty title field in create mode: the starters it may offer (state 7). */
  starters?: StripStarters | null;
  /**
   * Quick Add's form: the Suggest view's options (already fitted to the strip's width), and
   * which resting view shows. Absent elsewhere: the starters or the clipboard as before.
   */
  suggest?: readonly SuggestOption[] | null;
  view?: StripView;
}

/** The most fixes the strip shows at once (§1.4). */
export const MAX_SHOWN_FIXES = 2;

/** `Tue 17 Nov 14:00 · 45 min` - the usual slot's button. */
export function usualSlotLabel(slot: UsualSlot): string {
  return `${formatFullDate(slot.date, false)} ${formatTime(slot.time)} · ${formatLength(slot.minutes)}`;
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
  const usual = state.usual ? usualSlotLabel(state.usual) : null;
  const empty = !value.trim();
  if (field === 'date') {
    const label = isValidIsoDate(value.trim()) ? formatFullDate(value.trim()) : null;
    return {kind: 'date', label, warning: label ? state.warning ?? null : null, usual};
  }
  if (field === 'time') {
    if (empty) return usual ? {kind: 'usual', usual} : {kind: 'none'};
    const label = timeLabel(value);
    return label ? {kind: 'time', label, warning: state.warning ?? null} : {kind: 'none'};
  }
  const starters = state.starters;
  const offered = empty && starters ? starters : {thread: false, loop: false, paste: false};
  if (state.suggest) {
    if (state.view === 'clipboard') return {kind: 'clipboard'};
    return {kind: 'suggest', ...offered, options: [...state.suggest]};
  }
  if (empty && starters && (starters.thread || starters.loop || starters.paste)) return {kind: 'starters', ...starters};
  return {kind: 'clipboard'};
}

/** Where a new item's page goes: the setup and the tag that chose it, else the item's home notebook. */
export interface PagePlace {
  setupName: string | null;
  setupTag: string | null;
  home: 'project' | 'area' | null;
  /** Below the item's PARA folder; null for an own note. */
  file: string | null;
}

/**
 * The place line (docs/dev/history/technical-design-quickadd-redesign.md §11 G8):
 * `#daily: Meetings/Daily 2026.note`, `Project home note: Atruvia/Atruvia 2026.note`, `Own note`.
 */
export function placeFeedback(place: PagePlace): string {
  const file = place.file ?? 'own note';
  if (place.setupTag) return `#${place.setupTag}: ${file}`;
  if (place.setupName) return `${place.setupName}: ${file}`;
  if (place.home && place.file) return `${place.home === 'project' ? 'Project' : 'Area'} home note: ${place.file}`;
  return place.file ?? 'Own note';
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
  return `overlaps ${title} ${formatTime(time)}`;
}

export const PAST_WARNING = 'past';

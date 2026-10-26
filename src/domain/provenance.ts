/**
 * Provenance: the meeting a todo was agreed in
 * (docs/dev/history/technical-design-tending-threads.md §3.4). Pure.
 *
 * Written as the trailing field `[meeting:: <key>]`; the key is the meeting's
 * shared-page keyword `<date> <display title>` (domain/sharedNotePages.ts's
 * `meetingPageKeyword`) with `#`, `[` and `]` left out: the brackets would end
 * the field, and Obsidian reads a `#tag` inside a field as a tag of the todo.
 * The tag text stays (`2026-10-08 1:1 Mieke mh 101/mieke`), so two meetings
 * with the same title on one day but different thread tags keep different
 * keys. Resolution (decisions D11, D14): an exact key match among the
 * meetings of the todo's own scope, then among all meetings; failing that
 * (the meeting was renamed) a meeting on the key's date whose thread tags
 * appear as words in the key; else unresolved, shown as "from <key>".
 * Renaming a meeting never rewrites other lines.
 *
 * Provenance records where a todo was agreed and nothing else: writing it
 * sets only the field, never a tag (decision D12; tags are only ever set by
 * the user). Quick Add shows it in one grey line before saving
 * (`provenanceLabel`), and ✕ there drops it for that one todo.
 *
 * Speed (docs/dev/history/technical-design-perf-threads.md §3.1-3.3). Two
 * module-level memos keep resolution cheap without changing its result:
 * - `meetingKey` remembers keys by content (`date` + `title`), so a changed
 *   copy or a draft never gets a stale key; cleared at MEMO_CAP entries.
 * - Each meetings list gets a lookup table (key → first index, date →
 *   indexes) the first time it is searched, held in a WeakMap by the array
 *   object. Cached arrays and entries are replaced, never changed in place
 *   (docs/dev/design-overview.md §3), so a changed file brings a new array and
 *   thus a new table, and nothing has to be invalidated. A table whose list
 *   length differs from the one it was built for is rebuilt.
 */
import {formatDayHeader} from './dateFormat';
import {stripAllTags} from './markdown';
import {meetingDisplayTitle} from './meetingTracking';
import {meetingPageKeyword, parseKeywordLeadingDate} from './sharedNotePages';
import {appendTaskFields} from './taskLine';
import {parseTaskInput} from './taskEdit';
import {threadOf, threadsOfTags} from './threads';
import {Meeting} from './types';

/** `text` as a provenance key: without `#`, `[` and `]`, whitespace collapsed. */
export function normalizeMeetingKey(text: string): string {
  return text.replace(/[#[\]]/g, '').replace(/\s+/g, ' ').trim();
}

/** Entries a memo holds before it is cleared: a few hundred meetings per data set, plus drafts. */
const MEMO_CAP = 4000;
const keyMemo = new Map<string, string>();
const stats = {keyBuilds: 0};

/** Test-only: how often a key was built (memo misses), the memo's size, and a reset. */
export const __provenanceStatsForTests = {
  keyBuilds: () => stats.keyBuilds,
  memoSize: () => keyMemo.size,
  reset: () => {
    stats.keyBuilds = 0;
    keyMemo.clear();
  },
};

/** The provenance key of `meeting` (memoized by content, see the module doc comment). */
export function meetingKey(meeting: Pick<Meeting, 'date' | 'title'>): string {
  const memoKey = `${meeting.date}\u0000${meeting.title}`;
  const known = keyMemo.get(memoKey);
  if (known !== undefined) return known;
  stats.keyBuilds++;
  const key = normalizeMeetingKey(meetingPageKeyword(meeting));
  if (keyMemo.size >= MEMO_CAP) keyMemo.clear();
  keyMemo.set(memoKey, key);
  return key;
}

/**
 * A composed Quick Add line (text plus trailing fields) with provenance
 * applied: `[meeting:: key]` is set; the text stays as typed.
 */
export function applyProvenance(composedLine: string, key: string): string {
  const {text, fields} = parseTaskInput(composedLine);
  return appendTaskFields(text, {...fields, meeting: key});
}

/** The meeting's title without tags, for the provenance line ("Retro alpha"). */
function plainTitle(meeting: Pick<Meeting, 'title'>): string {
  const display = meetingDisplayTitle(meeting);
  return stripAllTags(display) || display;
}

/** Quick Add's grey line: `↳ from Retro alpha · Tue 30.9.`. */
export function provenanceLabel(meeting: Pick<Meeting, 'date' | 'title'>, today: string): string {
  return `↳ from ${plainTitle(meeting)} · ${formatDayHeader(meeting.date, today)}`;
}

/** The meetings of one Project/Area or the Inbox. */
export interface ProvenanceSource {
  path: string;
  meetings: readonly Meeting[];
}

export interface ProvenanceMatch {
  path: string;
  /** Index into that source's full meetings array. */
  meetingIndex: number;
  meeting: Meeting;
  /** False when found by the date + thread tag fallback (D14). */
  exact: boolean;
}

/** A meetings list's lookup table: the first index per key, every index per date (cancelled included). */
interface MeetingListIndex {
  /** The list's length when the table was built (the guard, see the module doc comment). */
  length: number;
  firstByKey: Map<string, number>;
  byDate: Map<string, number[]>;
}

const indexes = new WeakMap<readonly Meeting[], MeetingListIndex>();

function indexOf(meetings: readonly Meeting[]): MeetingListIndex {
  const known = indexes.get(meetings);
  if (known && known.length === meetings.length) return known;
  const index: MeetingListIndex = {length: meetings.length, firstByKey: new Map(), byDate: new Map()};
  meetings.forEach((m, i) => {
    const key = meetingKey(m);
    if (!index.firstByKey.has(key)) index.firstByKey.set(key, i);
    const onDate = index.byDate.get(m.date);
    if (onDate) onDate.push(i);
    else index.byDate.set(m.date, [i]);
  });
  indexes.set(meetings, index);
  return index;
}

function matchAt(source: ProvenanceSource, index: number, exact: boolean): ProvenanceMatch {
  return {path: source.path, meetingIndex: index, meeting: source.meetings[index], exact};
}

/**
 * The meeting `task` (a todo or an agreement) was agreed in, or null - see the module doc comment.
 * `scopePaths` is the scope of the todo's own item (domain/threads.ts's
 * `scopeOf`), searched first.
 */
export function resolveProvenance(
  task: {fields: {meeting: string | null}},
  sources: readonly ProvenanceSource[],
  scopePaths: readonly string[],
): ProvenanceMatch | null {
  // Normalized, so a hand-written key with `#` still matches.
  const key = task.fields.meeting ? normalizeMeetingKey(task.fields.meeting) : '';
  if (!key) return null;
  // Sources in the given order, those in scope first, then all; inside a source the first index.
  const inScope = sources.filter(s => scopePaths.includes(s.path));
  for (const group of [inScope, sources]) {
    for (const source of group) {
      const index = indexOf(source.meetings).firstByKey.get(key);
      if (index !== undefined) return matchAt(source, index, true);
    }
  }
  const date = parseKeywordLeadingDate(key);
  // The key's words as thread tags: `retro/alpha/2026` counts as `retro/alpha`.
  const keyThreads = key
    .toLowerCase()
    .split(' ')
    .map(word => threadOf(word)?.tag)
    .filter((tag): tag is string => !!tag);
  if (!date || keyThreads.length === 0) return null;
  for (const group of [inScope, sources]) {
    for (const source of group) {
      for (const index of indexOf(source.meetings).byDate.get(date) ?? []) {
        const m = source.meetings[index];
        if (!m.cancelled && threadsOfTags(m.tags).some(thread => keyThreads.includes(thread.tag))) return matchAt(source, index, false);
      }
    }
  }
  return null;
}

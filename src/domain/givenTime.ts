/**
 * Given time (docs/dev/history/technical-design-time-and-place.md §3.4,
 * D16-D18, §9.6): which owners - loops, threads, Projects, Areas, the Inbox
 * - got time in a period, from the schedule alone. Pure.
 *
 * - Every meeting and focus block that is not cancelled and covers a day of
 *   the range counts once, for `ownerOfMeeting` (its thread, else its active
 *   loop, else its Project or Area; the Inbox for an Inbox meeting). Timed:
 *   end - start (60 minutes without an end); all-day: 8 hours per covered day
 *   in the range for sorting, shown as days.
 * - `done`: todos completed in the range (`completion`), for `ownerOfTodo`.
 * - Given time: owners with scheduled time, by time (desc), then name.
 *   Worked on: owners with todos done and no scheduled time.
 * - The active context (domain/contexts.ts) applies: a meeting it dims and a
 *   todo it hides count for no row; owners left with nothing shown count in
 *   `hiddenOwners` (the hidden line).
 */
import {ContextMatcher} from './contexts';
import {EngageOwner, EngageSource, ownerKey, ownerOfMeeting, ownerOfTodo, ownerTitle, ownerTodos} from './engageOwner';
import {isNextTask} from './engageOptions';
import {isFocusBlock} from './focusBlock';
import {coveredDaysIn, spanScanStart} from './meetingSpan';
import {meetingEndMs, meetingStartMs} from './meetingTime';
import {daysBetween} from './nextMeeting';
import {Meeting, Task} from './types';

export type GivenTimeOwner = EngageOwner | {kind: 'inbox'};

export interface GivenTimeRow {
  owner: GivenTimeOwner;
  /** "Loop", "Thread", "Project", "Area" or "Inbox". */
  kindLabel: string;
  name: string;
  /** Timed meetings and blocks, in minutes. */
  minutes: number;
  /** Covered days of all-day meetings in the range (8 h each for sorting). */
  allDayDays: number;
  blocks: number;
  meetings: number;
  done: number;
  /** The owner's first open `#next` todo, or null. */
  nextTodo: string | null;
}

export interface GivenTimeResult {
  given: GivenTimeRow[];
  workedOn: GivenTimeRow[];
  /** Owners with time or done todos that the context leaves out. */
  hiddenOwners: number;
}

export const ALL_DAY_MINUTES = 8 * 60;
const DEFAULT_MEETING_MINUTES = 60;

/** Minutes a timed meeting takes; 0 for an all-day one. */
export function meetingMinutes(meeting: Pick<Meeting, 'date' | 'time' | 'endTime' | 'days'>): number {
  if (!meeting.time) return 0;
  if (!meeting.endTime) return DEFAULT_MEETING_MINUTES;
  return Math.max(0, Math.round((meetingEndMs(meeting) - meetingStartMs(meeting)) / 60000));
}

/** "3 h", "1.5 h", "45 min", "1 day", "2 days · 3 h": the row's time. */
export function givenTimeText(row: Pick<GivenTimeRow, 'minutes' | 'allDayDays'>): string {
  const parts: string[] = [];
  if (row.allDayDays > 0) parts.push(`${row.allDayDays} day${row.allDayDays === 1 ? '' : 's'}`);
  if (row.minutes > 0) parts.push(row.minutes < 60 ? `${row.minutes} min` : `${Math.round((row.minutes / 60) * 10) / 10} h`);
  return parts.join(' · ');
}

/** The grey line: "2 blocks · 1 meeting · 3 done · next: Draft chapter". */
export function givenTimeDetail(row: GivenTimeRow): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return [
    row.blocks > 0 ? plural(row.blocks, 'block', 'blocks') : '',
    row.meetings > 0 ? plural(row.meetings, 'meeting', 'meetings') : '',
    row.done > 0 ? `${row.done} done` : '',
    row.nextTodo ? `next: ${row.nextTodo}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

const INBOX: GivenTimeOwner = {kind: 'inbox'};
const keyOf = (owner: GivenTimeOwner) => (owner.kind === 'inbox' ? 'inbox' : ownerKey(owner));
const sortMinutes = (row: GivenTimeRow) => row.minutes + row.allDayDays * ALL_DAY_MINUTES;

export function givenTimeOf(input: {source: EngageSource; range: {start: string; end: string}; matcher: ContextMatcher}): GivenTimeResult {
  const {source, range, matcher} = input;
  const rows = new Map<string, GivenTimeRow>();
  const hidden = new Set<string>();
  const scanFrom = spanScanStart(range.start);

  const rowOf = (owner: GivenTimeOwner): GivenTimeRow => {
    const key = keyOf(owner);
    let row = rows.get(key);
    if (!row) {
      const title = owner.kind === 'inbox' ? {kindLabel: 'Inbox', name: 'Inbox'} : ownerTitle(owner, source);
      row = {owner, kindLabel: title.kindLabel, name: title.name, minutes: 0, allDayDays: 0, blocks: 0, meetings: 0, done: 0, nextTodo: null};
      rows.set(key, row);
    }
    return row;
  };
  const addMeeting = (owner: GivenTimeOwner, meeting: Meeting, shown: boolean) => {
    if (meeting.cancelled || meeting.date < scanFrom || meeting.date > range.end) return;
    const days = coveredDaysIn(meeting, range.start, range.end);
    if (days.length === 0) return;
    if (!shown) {
      hidden.add(keyOf(owner));
      return;
    }
    const row = rowOf(owner);
    if (meeting.time) row.minutes += meetingMinutes(meeting);
    else row.allDayDays += days.length;
    if (isFocusBlock(meeting)) row.blocks++;
    else row.meetings++;
  };
  const doneIn = (task: Task) => task.done && !task.cancelled && !!task.fields.completion && task.fields.completion >= range.start && task.fields.completion <= range.end;

  for (const item of source.items) {
    for (const meeting of item.meetings) {
      const owner = ownerOfMeeting({itemPath: item.path, meeting}, source);
      if (owner) addMeeting(owner, meeting, matcher.meetingState(item, meeting) === 'shown');
    }
    for (const task of item.tasks) {
      if (!doneIn(task)) continue;
      const owner = ownerOfTodo({itemPath: item.path, task}, source);
      if (!owner) continue;
      if (matcher.taskShown(item, {tags: task.tags, dueDate: null}, '')) rowOf(owner).done++;
      else hidden.add(keyOf(owner));
    }
  }
  if (source.inbox) {
    for (const meeting of source.inbox.meetings) addMeeting(INBOX, meeting, true);
    for (const task of source.inbox.tasks) if (doneIn(task)) rowOf(INBOX).done++;
  }

  for (const row of rows.values()) {
    row.nextTodo = firstNext(row.owner, source);
    hidden.delete(keyOf(row.owner));
  }
  const all = Array.from(rows.values());
  const byTime = (a: GivenTimeRow, b: GivenTimeRow) => sortMinutes(b) - sortMinutes(a) || a.name.localeCompare(b.name);
  return {
    given: all.filter(r => sortMinutes(r) > 0).sort(byTime),
    workedOn: all.filter(r => sortMinutes(r) === 0 && r.done > 0).sort((a, b) => b.done - a.done || a.name.localeCompare(b.name)),
    hiddenOwners: hidden.size,
  };
}

function firstNext(owner: GivenTimeOwner, source: EngageSource): string | null {
  const plain = (task: Task) => task.text.replace(/\s*#\S+/g, '').trim() || task.text;
  if (owner.kind === 'inbox') {
    const task = source.inbox?.tasks.find(t => !t.done && !t.cancelled && isNextTask(t));
    return task ? plain(task) : null;
  }
  const next = ownerTodos(owner, source).find(t => isNextTask(t.task));
  return next ? plain(next.task) : null;
}

/** Whether a thread or loop has "nothing planned" (D29, §9.14): no meeting or focus block in the next `windowDays` days. */
export function nothingPlanned(nextMeeting: string | null, today: string, windowDays = 14): boolean {
  return nextMeeting === null || daysBetween(today, nextMeeting) > windowDays;
}

/** The Tend line's counts (D18): threads and loops with nothing planned. */
export function tendCount(
  rosters: {threads: ReadonlyArray<{nextMeeting: string | null}>; loops: ReadonlyArray<{nextMeeting: string | null}>},
  today: string,
  windowDays = 14,
): {threads: number; loops: number} {
  return {
    threads: rosters.threads.filter(t => nothingPlanned(t.nextMeeting, today, windowDays)).length,
    loops: rosters.loops.filter(l => nothingPlanned(l.nextMeeting, today, windowDays)).length,
  };
}

/** "Tend: 3 threads · 2 loops quiet ›", or null when nothing is quiet. */
export function tendLineText(count: {threads: number; loops: number}): string | null {
  const parts = [
    count.threads > 0 ? `${count.threads} thread${count.threads === 1 ? '' : 's'}` : '',
    count.loops > 0 ? `${count.loops} loop${count.loops === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? `Tend: ${parts.join(' · ')} quiet ›` : null;
}

/**
 * The Project/Area page's line (D30): minutes scheduled in `meetings` - the
 * item's own, an Area's with its Projects' - over the range (all-day days at
 * 8 h). A single page is never filtered by the context.
 */
export function scheduledMinutes(meetings: readonly Meeting[], range: {start: string; end: string}): number {
  let minutes = 0;
  for (const meeting of meetings) {
    if (meeting.cancelled) continue;
    const days = coveredDaysIn(meeting, range.start, range.end);
    if (days.length === 0) continue;
    minutes += meeting.time ? meetingMinutes(meeting) : days.length * ALL_DAY_MINUTES;
  }
  return minutes;
}

/** "3 h", "45 min", or "–" for none: the page line's value per period. */
export function hoursText(minutes: number): string {
  if (minutes === 0) return '–';
  return minutes < 60 ? `${minutes} min` : `${Math.round((minutes / 60) * 10) / 10} h`;
}

/**
 * Given time (docs/dev/history/technical-design-time-and-place.md §3.4, §10
 * C2, D16-D18): where the time of a period went, from the schedule alone. Two
 * lists. Pure.
 *
 * - `areas`: every Area with everything scheduled in it and in its Projects,
 *   and every Project without an Area - one list, by time (desc), then name.
 *   A meeting or focus block counts for its file's item, a Project rolled up
 *   into its Area. Timed: end - start (60 minutes without an end); all-day:
 *   8 hours per covered day in the range for sorting, shown as days.
 * - `owners`: loops and counterparts - the same meeting counts here once more
 *   when `ownerOfMeeting` names a loop or a thread - from `minMinutes` up. A
 *   thread counts for its counterpart (§10 C11): `retro/value`,
 *   `review/value` and `#wf/value` all make one row "value" per scope (an
 *   Area with its Projects, or a Project without an Area); a leaf in two
 *   scopes gets the scope's name ("value · Home"). Loops stay one row each.
 * - `done`: todos completed in the range (`completion`): for the rolled-up
 *   item in `areas`, for their loop or thread (`ownerOfTodo`) in `owners`.
 * - `workedOn`: Areas and Projects with todos done and nothing scheduled.
 * - The Inbox is never listed.
 * - The active context (domain/contexts.ts) applies: a meeting it dims and a
 *   todo it hides count for no row; owners left with nothing shown count in
 *   `hiddenOwners` (the hidden line).
 */
import {ContextMatcher} from './contexts';
import {WAITING_FOR_TYPE} from './flowState';
import {OWE_TYPE} from './threads';
import {EngageItem, EngageOwner, EngageSource, ownerKey, ownerOfMeeting, ownerOfTodo, ownerTitle, ownerTodos} from './engageOwner';
import {isNextTask} from './engageOptions';
import {isFocusBlock} from './focusBlock';
import {coveredDaysIn, spanScanStart} from './meetingSpan';
import {meetingEndMs, meetingStartMs} from './meetingTime';
import {daysBetween} from './nextMeeting';
import {Meeting, Task} from './types';

/** A counterpart within its scope: the leaf of its threads' tags (`retro/value` → `value`). */
export interface CounterpartOwner {
  kind: 'counterpart';
  scopeOwnerPath: string;
  leaf: string;
  /** Its thread tags with time or done todos, first seen first. */
  tags: string[];
}

export type GivenTimeOwner = EngageOwner | CounterpartOwner;

export interface GivenTimeRow {
  owner: GivenTimeOwner;
  /** "Loop", "Counterpart", "Project" or "Area". */
  kindLabel: string;
  name: string;
  /** Timed meetings and blocks, in minutes. */
  minutes: number;
  /** Covered days of all-day meetings in the range (8 h each for sorting). */
  allDayDays: number;
  blocks: number;
  meetings: number;
  done: number;
  /** The owner's first open `#next` todo (an Area's own, then its Projects'), or null. */
  nextTodo: string | null;
}

export interface GivenTimeResult {
  /** Areas (with their Projects) and Projects without an Area, by time. */
  areas: GivenTimeRow[];
  /** Loops and counterparts with at least `minMinutes`, by time. */
  owners: GivenTimeRow[];
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

/** The grey line: "2 blocks · 1 meeting · 3 done · next: Draft chapter"; a counterpart's starts with its threads' types ("retro · review"). */
export function givenTimeDetail(row: GivenTimeRow): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  // The series it meets in; #wf and #owe are no series.
  const types =
    row.owner.kind === 'counterpart'
      ? Array.from(new Set(row.owner.tags.map(t => t.split('/')[0]).filter(t => t !== WAITING_FOR_TYPE && t !== OWE_TYPE))).join(' · ')
      : '';
  return [
    types,
    row.blocks > 0 ? plural(row.blocks, 'block', 'blocks') : '',
    row.meetings > 0 ? plural(row.meetings, 'meeting', 'meetings') : '',
    row.done > 0 ? `${row.done} done` : '',
    row.nextTodo ? `next: ${row.nextTodo}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "Nothing above 1 h this week": the empty Loops and counterparts list. */
export function belowThresholdText(minMinutes: number, period: string): string {
  return minMinutes > 0 ? `Nothing above ${hoursText(minMinutes)} ${period}` : `Nothing ${period}`;
}

export const sortMinutes = (row: Pick<GivenTimeRow, 'minutes' | 'allDayDays'>) => row.minutes + row.allDayDays * ALL_DAY_MINUTES;

/** A Project's Area when it is a known item, else the item itself. */
function rolledUp(item: EngageItem, source: EngageSource): EngageItem {
  if (item.kind !== 'project' || !item.area) return item;
  return source.items.find(i => i.kind === 'area' && i.name === item.area) ?? item;
}

export function givenTimeOf(input: {source: EngageSource; range: {start: string; end: string}; matcher: ContextMatcher; minMinutes: number}): GivenTimeResult {
  const {source, range, matcher, minMinutes} = input;
  const areaRows = new Map<string, GivenTimeRow>();
  const ownerRows = new Map<string, GivenTimeRow>();
  const hidden = new Set<string>();
  const scanFrom = spanScanStart(range.start);

  const rowOf = (rows: Map<string, GivenTimeRow>, owner: GivenTimeOwner): GivenTimeRow => {
    const key = keyOf(owner);
    let row = rows.get(key);
    if (!row) {
      const title = owner.kind === 'counterpart' ? {kindLabel: 'Counterpart', name: owner.leaf} : ownerTitle(owner, source);
      row = {owner, kindLabel: title.kindLabel, name: title.name, minutes: 0, allDayDays: 0, blocks: 0, meetings: 0, done: 0, nextTodo: null};
      rows.set(key, row);
    }
    if (row.owner.kind === 'counterpart' && owner.kind === 'counterpart') {
      for (const tag of owner.tags) if (!row.owner.tags.includes(tag)) row.owner.tags.push(tag);
    }
    return row;
  };
  const addTime = (row: GivenTimeRow, meeting: Meeting, days: number) => {
    if (meeting.time) row.minutes += meetingMinutes(meeting);
    else row.allDayDays += days;
    if (isFocusBlock(meeting)) row.blocks++;
    else row.meetings++;
  };
  const doneIn = (task: Task) => task.done && !task.cancelled && !!task.fields.completion && task.fields.completion >= range.start && task.fields.completion <= range.end;

  for (const item of source.items) {
    const home: GivenTimeOwner = {kind: 'item', itemPath: rolledUp(item, source).path};
    for (const meeting of item.meetings) {
      if (meeting.cancelled || meeting.date < scanFrom || meeting.date > range.end) continue;
      const days = coveredDaysIn(meeting, range.start, range.end).length;
      if (days === 0) continue;
      const side = sideOwner(ownerOfMeeting({itemPath: item.path, meeting}, source));
      if (matcher.meetingState(item, meeting) !== 'shown') {
        hidden.add(ownerKey(home));
        if (side) hidden.add(keyOf(side));
        continue;
      }
      addTime(rowOf(areaRows, home), meeting, days);
      if (side) addTime(rowOf(ownerRows, side), meeting, days);
    }
    for (const task of item.tasks) {
      if (!doneIn(task)) continue;
      const side = sideOwner(ownerOfTodo({itemPath: item.path, task}, source));
      if (!matcher.taskShown(item, {tags: task.tags, dueDate: null}, '')) {
        hidden.add(ownerKey(home));
        if (side) hidden.add(keyOf(side));
        continue;
      }
      rowOf(areaRows, home).done++;
      if (side) rowOf(ownerRows, side).done++;
    }
  }

  for (const row of [...areaRows.values(), ...ownerRows.values()]) {
    row.nextTodo = firstNext(row.owner, source);
    hidden.delete(keyOf(row.owner));
  }
  // The same leaf in two scopes: name the scope.
  const counterparts = Array.from(ownerRows.values()).filter(r => r.owner.kind === 'counterpart');
  for (const row of counterparts) {
    const owner = row.owner as CounterpartOwner;
    if (counterparts.filter(r => (r.owner as CounterpartOwner).leaf === owner.leaf).length > 1) {
      row.name = `${owner.leaf} · ${source.items.find(i => i.path === owner.scopeOwnerPath)?.name ?? ''}`;
    }
  }
  const byTime = (a: GivenTimeRow, b: GivenTimeRow) => sortMinutes(b) - sortMinutes(a) || a.name.localeCompare(b.name);
  const areas = Array.from(areaRows.values());
  return {
    areas: areas.filter(r => sortMinutes(r) > 0).sort(byTime),
    owners: Array.from(ownerRows.values())
      .filter(r => sortMinutes(r) > 0 && sortMinutes(r) >= minMinutes)
      .sort(byTime),
    workedOn: areas.filter(r => sortMinutes(r) === 0 && r.done > 0).sort((a, b) => b.done - a.done || a.name.localeCompare(b.name)),
    hiddenOwners: hidden.size,
  };
}

/** A loop stays; a thread becomes its counterpart; an item or none is no side row. */
function sideOwner(owner: EngageOwner | null): Exclude<GivenTimeOwner, {kind: 'item'}> | null {
  if (!owner || owner.kind === 'item') return null;
  if (owner.kind === 'loop') return owner;
  const leaf = owner.tag.split('/').slice(1).join('/');
  return {kind: 'counterpart', scopeOwnerPath: owner.scopeOwnerPath, leaf, tags: [owner.tag]};
}

const keyOf = (owner: GivenTimeOwner) => (owner.kind === 'counterpart' ? `counterpart:${owner.scopeOwnerPath}|${owner.leaf}` : ownerKey(owner));

function firstNext(owner: GivenTimeOwner, source: EngageSource): string | null {
  const plain = (task: Task) => task.text.replace(/\s*#\S+/g, '').trim() || task.text;
  if (owner.kind === 'counterpart') {
    for (const tag of owner.tags) {
      const next = ownerTodos({kind: 'thread', scopeOwnerPath: owner.scopeOwnerPath, tag}, source).find(t => isNextTask(t.task));
      if (next) return plain(next.task);
    }
    return null;
  }
  const owners: EngageOwner[] = [owner];
  if (owner.kind === 'item') {
    const area = source.items.find(i => i.path === owner.itemPath);
    if (area?.kind === 'area') {
      for (const p of source.items) if (p.kind === 'project' && p.area === area.name) owners.push({kind: 'item', itemPath: p.path});
    }
  }
  for (const o of owners) {
    const next = ownerTodos(o, source).find(t => isNextTask(t.task));
    if (next) return plain(next.task);
  }
  return null;
}

/** Whether a thread or loop has "nothing planned" (D29, §9.14): no meeting or focus block in the next `windowDays` days. */
export function nothingPlanned(nextMeeting: string | null, today: string, windowDays = 14): boolean {
  return nextMeeting === null || daysBetween(today, nextMeeting) > windowDays;
}

/** What says whether an active counterpart needs tending (tendingRoster's entry fits). */
export interface TendSignals {
  nextMeeting: string | null;
  oweCount: number;
  /** Open `#next` todos of the counterpart. */
  nextCount: number;
}

/**
 * Whether an active counterpart needs tending (§10 C3): nothing planned in
 * the next `windowDays` days and no `#next` or I-owe todo moving it forward.
 */
export function needsTending(entry: TendSignals, today: string, windowDays = 14): boolean {
  return nothingPlanned(entry.nextMeeting, today, windowDays) && entry.oweCount === 0 && entry.nextCount === 0;
}

/** The Tend line's counts (D18): active threads that need tending, loops that need a look (storage/loopRoster.ts). */
export function tendCount(
  rosters: {threads: readonly TendSignals[]; loops: ReadonlyArray<{attention: string | null}>},
  today: string,
  windowDays = 14,
): {threads: number; loops: number} {
  return {
    threads: rosters.threads.filter(t => needsTending(t, today, windowDays)).length,
    loops: rosters.loops.filter(l => l.attention !== null).length,
  };
}

/** "Tend: 3 counterparts · 2 loops quiet ›" (`threads` counts the roster's counterparts), or null when nothing is quiet. */
export function tendLineText(count: {threads: number; loops: number}): string | null {
  const parts = [
    count.threads > 0 ? `${count.threads} counterpart${count.threads === 1 ? '' : 's'}` : '',
    count.loops > 0 ? `${count.loops} loop${count.loops === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? `Tend: ${parts.join(' · ')} quiet ›` : null;
}

/** "3 h", "45 min", or "–" for none. */
export function hoursText(minutes: number): string {
  if (minutes === 0) return '–';
  return minutes < 60 ? `${minutes} min` : `${Math.round((minutes / 60) * 10) / 10} h`;
}

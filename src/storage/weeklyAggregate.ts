/**
 * Cross-project aggregation for the Week view (docs/dev/technical-design-weekly-
 * view.md §3) - the weekly counterpart of storage/dailyAggregate.ts, same
 * "pure, synchronous transform over the already-warm storage/dataCache.ts
 * cache" pattern (no filesystem I/O here at all).
 *
 * Scoped to an explicit [weekStart, weekEnd] date range (inclusive,
 * YYYY-MM-DD) rather than "today" - the Week view navigates to arbitrary
 * weeks, so unlike buildDailyAggregate this never defaults its range from
 * `new Date()`: every not-cancelled meeting (across every Project/Area plus
 * Inbox) dated within the range, soonest first. Reuses
 * storage/dailyAggregate.ts's `DailyItemRef`/`inboxItemRef` for the "source
 * item" shape (the Week grid wants the exact same source-subtext/jump-to-item
 * behavior DailyView's Calendar column has). What got time in the week is
 * domain/givenTime.ts's job.
 */
import {entriesInRange, entryDate, MeetingSpanDay} from '../domain/meetingSpan';
import {meetingTimestampMs} from '../domain/meetingTime';
import {Meeting} from '../domain/types';
import {CachedItem} from './dataCache';
import {DailyInboxInput, DailyItemRef, inboxItemRef} from './dailyAggregate';
import {perfTime} from '../utils/perf';

export interface WeeklyMeetingEntry {
  item: DailyItemRef;
  meetingIndex: number;
  meeting: Meeting;
  /**
   * Set only for a multi-day meeting (`3d`): which covered day this entry
   * stands for. Such a meeting yields one entry per covered day in range
   * (docs/dev/history/technical-design-monthly-view.md), each listed under
   * `span.date` with continuation arrows.
   */
  span?: MeetingSpanDay;
}

export {entryDate} from '../domain/meetingSpan';

export interface WeeklyAggregate {
  /** Every not-cancelled meeting (all items plus Inbox) dated within the range, soonest first. */
  meetings: WeeklyMeetingEntry[];
}

/** Pure in-memory aggregation over already-cached items plus Inbox's own tasks/meetings - see the module doc comment. `inboxPath` addresses the synthetic Inbox item (same `inboxItemRef` DailyView/dailyAggregate.ts use); ignored when `inbox` is null. `weekStart`/`weekEnd` are inclusive YYYY-MM-DD bounds - domain/weekDate.ts's `weekRangeIso` (optionally shifted via `shiftWeeks`) is how WeekView.tsx produces them. */
function buildWeeklyAggregateImpl(
  items: CachedItem[],
  inbox: DailyInboxInput | null,
  inboxPath: string,
  weekStart: string,
  weekEnd: string,
): WeeklyAggregate {
  const meetings: WeeklyMeetingEntry[] = [];

  for (const cachedItem of items) {
    if (cachedItem.loadError) continue;
    const item: DailyItemRef = {
      kind: cachedItem.kind,
      name: cachedItem.name,
      path: cachedItem.path,
      abbrev: cachedItem.abbrev,
    };

    cachedItem.meetings.forEach((meeting, meetingIndex) => {
      if (!meeting.cancelled) meetings.push(...entriesInRange({item, meetingIndex, meeting}, weekStart, weekEnd));
    });
  }

  if (inbox) {
    const item = inboxItemRef(inboxPath);
    inbox.meetings.forEach((meeting, meetingIndex) => {
      if (!meeting.cancelled) meetings.push(...entriesInRange({item, meetingIndex, meeting}, weekStart, weekEnd));
    });
  }

  // By listed day, then time (date-only after timed ones, as a whole day).
  meetings.sort((a, b) => {
    const da = entryDate(a);
    const db = entryDate(b);
    if (da !== db) return da < db ? -1 : 1;
    return meetingTimestampMs(a.meeting) - meetingTimestampMs(b.meeting);
  });

  return {meetings};
}

/** Perf-traced entry point (docs/dev/history/technical-design-perf-tracing.md) - see buildWeeklyAggregateImpl above for the actual logic. */
export function buildWeeklyAggregate(...args: Parameters<typeof buildWeeklyAggregateImpl>): ReturnType<typeof buildWeeklyAggregateImpl> {
  return perfTime('agg:weekly', () => buildWeeklyAggregateImpl(...args));
}

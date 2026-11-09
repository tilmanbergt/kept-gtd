/**
 * The meeting hints of the writing help (docs/dev/history/technical-design-writing-help.md
 * §1.6, §3.6): the usual slot of a thread or loop, an overlap with another
 * meeting that day, and a new meeting in the past. Pure. They only inform -
 * nothing here blocks, moves or saves a meeting.
 */
import {addDaysToIso} from '../dateNudge';
import {meetingEndMs, meetingStartMs, todayIso} from '../meetingTime';
import {Meeting} from '../types';

/** A meeting slot: date, start and end (HH:mm). */
export interface MeetingSlot {
  date: string;
  time: string;
  endTime: string;
}

/** The usual slot with its length, for the strip's button. */
export interface UsualSlot extends MeetingSlot {
  minutes: number;
}

const USUAL_WINDOW = 5;
const DEFAULT_MINUTES = 60;

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function lengthOf(meeting: Pick<Meeting, 'time' | 'endTime'>): number {
  if (!meeting.endTime) return DEFAULT_MINUTES;
  const length = minutesOf(meeting.endTime) - minutesOf(meeting.time);
  return length > 0 ? length : DEFAULT_MINUTES;
}

/**
 * The usual slot of `meetings` (one thread's or loop's), or null without a
 * timed one: among the last five timed meetings by start, the weekday and
 * start time most of them share (at least two), else the latest; its length
 * the median of that group's (1 h without an end); its date the next such
 * weekday from `now` - today only while the start is still ahead.
 */
export function usualSlot(meetings: readonly Meeting[], now: Date): UsualSlot | null {
  const timed = meetings
    .filter(m => !m.cancelled && m.time)
    .sort((a, b) => (`${b.date} ${b.time}` < `${a.date} ${a.time}` ? -1 : 1))
    .slice(0, USUAL_WINDOW);
  if (timed.length === 0) return null;
  const groups = new Map<string, Meeting[]>();
  for (const m of timed) {
    const key = `${weekdayOf(m.date)} ${m.time}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  // Ties go to the group holding the latest meeting: it was inserted first.
  let largest: Meeting[] | null = null;
  for (const g of groups.values()) if (g.length >= 2 && (!largest || g.length > largest.length)) largest = g;
  const group = largest ?? [timed[0]];
  const lengths = group.map(lengthOf).sort((a, b) => a - b);
  const minutes = lengths[Math.floor((lengths.length - 1) / 2)];
  const {time} = group[0];
  const weekday = weekdayOf(group[0].date);
  const today = todayIso(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let date = today;
  for (let i = 0; i < 8; i++) {
    date = addDaysToIso(today, i);
    if (weekdayOf(date) === weekday && (i > 0 || minutesOf(time) > nowMinutes)) break;
  }
  const end = minutesOf(time) + minutes;
  return {date, time, endTime: end < 24 * 60 ? clock(end) : '', minutes};
}

/**
 * The first meeting (by start) of `dayMeetings` on the slot's date, not
 * cancelled and timed, whose time (its end, or 1 h) overlaps the slot - or
 * null. The caller leaves out the meeting being edited.
 */
export function overlapOf<T extends Pick<Meeting, 'date' | 'time' | 'endTime' | 'cancelled'>>(slot: MeetingSlot, dayMeetings: readonly T[]): T | null {
  if (!slot.time) return null;
  const start = meetingStartMs(slot);
  const end = meetingEndMs({...slot, days: 1});
  let first: T | null = null;
  for (const m of dayMeetings) {
    if (m.cancelled || !m.time || m.date !== slot.date) continue;
    if (meetingStartMs(m) < end && meetingEndMs({...m, days: 1}) > start && (!first || m.time < first.time)) first = m;
  }
  return first;
}

/** Whether a new meeting at `date` (and `time`, '' for none) starts before `now`; a date-only meeting today is not past. */
export function isPastNew(date: string, time: string, now: Date): boolean {
  const today = todayIso(now);
  if (date < today) return true;
  if (date > today || !time) return false;
  return meetingStartMs({date, time}) < now.getTime();
}

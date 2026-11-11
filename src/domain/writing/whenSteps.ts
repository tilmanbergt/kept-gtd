/**
 * The steps of Quick Add's date and time strips
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.2, D2): lengths
 * and 30-minute shifts for a meeting's time field, the day nudges for a date
 * field, and the short form of a meeting's warning. Pure.
 *
 * A step that can't act is returned disabled, never left out, so the strip
 * keeps its layout: −30′ at 30 minutes or less, a shift or a longer end past
 * midnight, −1 d at one day. Nothing here searches for a free slot.
 */
import {DATE_NUDGES, DateNudge, isValidIsoDate, nudgeIsoDate} from '../dateNudge';
import {formatFullDate, formatTime} from '../dateFormat';
import {formatMeetingWhen, MAX_MEETING_DAYS, parseMeetingWhen} from '../meetingTime';

export type TimeStepId = 'len1h' | 'lenMinus30' | 'lenPlus30' | 'shiftEarlier' | 'shiftLater' | 'day1' | 'daysMinus1' | 'daysPlus1';
export type DateStepId = 'dateMinus1' | 'dateToday' | 'datePlus1' | 'datePlus7';
export type StepId = TimeStepId | DateStepId;

export interface Step<Id extends StepId = StepId> {
  id: Id;
  label: string;
  enabled: boolean;
}

export interface Steps<Id extends StepId = StepId> {
  /** The strip's left slot at rest: the length, the start, the days or the full date; null for none. */
  info: string | null;
  steps: Step<Id>[];
}

const DAY_MINUTES = 24 * 60;
const SHIFT = 30;

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** A meeting's length for the strip: `30 min`, `1 h`, `1 h 30`. */
export function shortLength(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} h${rest > 0 ? ` ${rest}` : ''}`;
}

/** `2 days`, `1 day`. */
function daysText(days: number): string {
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** The labels, full or for a narrow screen (§3.9: shifts become ‹ and ›). */
function timeLabels(narrow: boolean): Record<TimeStepId, string> {
  return {
    len1h: narrow ? '1h' : '1 h',
    lenMinus30: narrow ? '−30' : '−30′',
    lenPlus30: narrow ? '+30' : '+30′',
    shiftEarlier: narrow ? '‹' : '‹ 30′',
    shiftLater: narrow ? '›' : '30′ ›',
    day1: '1 d',
    daysMinus1: '−1 d',
    daysPlus1: '+1 d',
  };
}

/** What a time field's text holds, or null when it is empty or unreadable. */
type Reading = {kind: 'start'; start: number} | {kind: 'span'; start: number; end: number} | {kind: 'days'; days: number};

function readTime(value: string): Reading | null {
  if (!value.trim()) return null;
  const parsed = parseMeetingWhen(value);
  if (!parsed.ok) return null;
  const {time, endTime, days} = parsed.value;
  if (!time) return {kind: 'days', days};
  return endTime ? {kind: 'span', start: minutesOf(time), end: minutesOf(endTime)} : {kind: 'start', start: minutesOf(time)};
}

/** The time strip's Adjust view for a meeting time field's text (§3.2's table). */
export function timeSteps(value: string, narrow = false): Steps<TimeStepId> {
  const reading = readTime(value);
  const labels = timeLabels(narrow);
  const step = (id: TimeStepId, enabled: boolean): Step<TimeStepId> => ({id, label: labels[id], enabled});
  if (!reading) return {info: null, steps: []};
  if (reading.kind === 'days') {
    return {
      info: daysText(reading.days),
      steps: [step('daysMinus1', reading.days > 1), step('daysPlus1', reading.days < MAX_MEETING_DAYS)],
    };
  }
  if (reading.kind === 'start') {
    const {start} = reading;
    return {
      info: formatTime(clock(start)),
      steps: [
        step('len1h', start + 60 < DAY_MINUTES),
        step('shiftEarlier', start - SHIFT >= 0),
        step('shiftLater', start + SHIFT < DAY_MINUTES),
        step('day1', true),
      ],
    };
  }
  const {start, end} = reading;
  return {
    info: shortLength(end - start),
    steps: [
      step('lenMinus30', end - start > SHIFT),
      step('lenPlus30', end + SHIFT < DAY_MINUTES),
      step('shiftEarlier', start - SHIFT >= 0),
      step('shiftLater', end + SHIFT < DAY_MINUTES),
      step('day1', true),
    ],
  };
}

/** The time field's text after step `id`; unchanged when the step can't act on it. */
export function applyTimeStep(value: string, id: TimeStepId): string {
  const reading = readTime(value);
  if (!reading) return value;
  const enabled = timeSteps(value).steps.find(s => s.id === id)?.enabled;
  if (!enabled) return value;
  if (id === 'day1') return formatMeetingWhen({time: '', endTime: '', days: 1});
  if (reading.kind === 'days') {
    const days = reading.days + (id === 'daysPlus1' ? 1 : id === 'daysMinus1' ? -1 : 0);
    return formatMeetingWhen({time: '', endTime: '', days});
  }
  const start = reading.start;
  const end = reading.kind === 'span' ? reading.end : null;
  const span = (s: number, e: number | null) => formatMeetingWhen({time: clock(s), endTime: e === null ? '' : clock(e), days: 1});
  switch (id) {
    case 'len1h':
      return span(start, start + 60);
    case 'lenMinus30':
      return end === null ? value : span(start, end - SHIFT);
    case 'lenPlus30':
      return end === null ? value : span(start, end + SHIFT);
    case 'shiftEarlier':
      return span(start - SHIFT, end === null ? null : end - SHIFT);
    case 'shiftLater':
      return span(start + SHIFT, end === null ? null : end + SHIFT);
    default:
      return value;
  }
}

const DATE_STEP_OF: Record<DateNudge, DateStepId> = {minus1: 'dateMinus1', today: 'dateToday', plus1: 'datePlus1', plus7: 'datePlus7'};

/** The date strip's Adjust view: the full date and today's nudges, all of them always able to act. */
export function dateSteps(value: string): Steps<DateStepId> {
  const trimmed = value.trim();
  return {
    info: isValidIsoDate(trimmed) ? formatFullDate(trimmed) : null,
    steps: DATE_NUDGES.map(n => ({id: DATE_STEP_OF[n.kind], label: n.label, enabled: true})),
  };
}

/** The date field's text after step `id` (domain/dateNudge.ts's rule: an unreadable date counts as today). */
export function applyDateStep(value: string, id: DateStepId, now: Date = new Date()): string {
  const nudge = (Object.keys(DATE_STEP_OF) as DateNudge[]).find(k => DATE_STEP_OF[k] === id) ?? 'today';
  return nudgeIsoDate(value, nudge, now);
}

/** A meeting's warning as the strips know it. */
export type MeetingWarning = {kind: 'past'} | {kind: 'overlap'; title: string; time: string};

const WARNING_TITLE_MAX = 12;

/** The warning's short form for the strip's left slot: `⚠ past`, `⚠ Team JF 15:00` (a title over 12 characters shortened). */
export function shortWarning(warning: MeetingWarning): string {
  if (warning.kind === 'past') return '⚠ past';
  const title = warning.title.trim();
  const short = title.length > WARNING_TITLE_MAX ? `${title.slice(0, WARNING_TITLE_MAX - 1).trimEnd()}…` : title;
  return `⚠ ${short} ${formatTime(warning.time)}`;
}

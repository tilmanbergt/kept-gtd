/**
 * The meeting hints for the Quick Add meeting being entered
 * (docs/dev/history/technical-design-writing-help.md §1.6, §3.6): the
 * warnings of its date and time strips (past, overlap) and the usual slot of
 * the thread or loop its tags name. Reads the cache and settings when called;
 * domain/writing/meetingHints.ts decides.
 */
import {isValidIsoDate} from '../../domain/dateNudge';
import {extractContextTags, stripAllTags} from '../../domain/markdown';
import {meetingDisplayTitle} from '../../domain/meetingTracking';
import {parseMeetingWhen} from '../../domain/meetingTime';
import {meetingsOfTag} from '../../domain/nextMeeting';
import {matchingSetups, setupTypeTag} from '../../domain/noteSetups';
import {isCounterpartType, threadOf} from '../../domain/threads';
import {Meeting} from '../../domain/types';
import {isPastNew, overlapOf, UsualSlot, usualSlot} from '../../domain/writing/meetingHints';
import {overlapWarning, PAST_WARNING} from '../../domain/writing/stripContent';
import {getCachedData, getCachedInbox} from '../../storage/dataCache';
import {peekSettings} from '../../storage/settingsSnapshot';

export interface DraftMeetingHints {
  dateWarning: string | null;
  timeWarning: string | null;
  usual: UsualSlot | null;
}

export const NO_MEETING_HINTS: DraftMeetingHints = {dateWarning: null, timeWarning: null, usual: null};

function allMeetings(): Meeting[] {
  const items = getCachedData()?.items ?? [];
  const inbox = getCachedInbox();
  return [...items.flatMap(i => i.meetings), ...(inbox?.meetings ?? [])];
}

/** The thread (`type/counterpart`) or the Thread/Loop setup tag the title's tags name, or null. */
function seriesTag(tags: readonly string[]): string | null {
  for (const tag of tags) {
    const thread = threadOf(tag);
    if (thread && !isCounterpartType(thread.type)) return thread.tag;
  }
  const setups = peekSettings()?.noteSetups ?? [];
  const setup = matchingSetups(tags, setups)[0];
  return setup ? setupTypeTag(tags, setup.tags) || null : null;
}

/** The hints for a draft meeting; `editing` turns the warnings off (§4: an edit is no new meeting, and it would overlap itself). */
export function draftMeetingHints(draft: {title: string; date: string; time: string}, editing: boolean, now: Date = new Date()): DraftMeetingHints {
  const meetings = allMeetings();
  const when = parseMeetingWhen(draft.time);
  const time = when.ok ? when.value.time : '';
  const endTime = when.ok ? when.value.endTime : '';
  let dateWarning: string | null = null;
  let timeWarning: string | null = null;
  if (!editing && isValidIsoDate(draft.date)) {
    const past = isPastNew(draft.date, time, now) ? PAST_WARNING : null;
    const other = time ? overlapOf({date: draft.date, time, endTime}, meetings) : null;
    const overlap = other ? overlapWarning(stripAllTags(meetingDisplayTitle(other)) || other.title, other.time) : null;
    dateWarning = past ?? overlap;
    timeWarning = overlap ?? past;
  }
  let usual: UsualSlot | null = null;
  if (!draft.time.trim()) {
    const tag = seriesTag(extractContextTags(draft.title));
    if (tag) usual = usualSlot(meetingsOfTag(meetings.map(meeting => ({meeting})), tag).map(e => e.meeting), now);
  }
  return {dateWarning, timeWarning, usual};
}

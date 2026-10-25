/**
 * Which meeting a note page belongs to - the provenance of todos captured
 * from it (docs/dev/history/technical-design-tending-threads.md §3.4), by the
 * page's section (docs/dev/history/technical-design-engage-page-owner.md
 * §3.6, P10).
 *
 * A capture (lasso) or a processed mark comes from one page of one note. That
 * page is a meeting's when the note is the meeting's own note, when the page
 * is the meeting's page (page link or keyword) or its Reflection page, or a
 * follow-up page of one of them - up to the next page that starts a section
 * of its own (your heading, a todo's page). A cancelled meeting's section
 * records nothing. The lookup is storage/pageSection.ts's; its sources
 * include the Inbox.
 */
import {Meeting, Task} from '../domain/types';
import type {PageIndexReader} from './notebookPages';
import {pageSectionOf} from './pageSection';
import {ThreadItemRef, ThreadSource} from './threadAggregate';

export interface NotePageMeeting {
  item: ThreadItemRef;
  meetingIndex: number;
  meeting: Meeting;
  /** Pages between the meeting's page and the captured one; 0 on the meeting's page. */
  distance: number;
}

/** The section a captured page belongs to, as Capture reads it. */
export interface SourceSection {
  /** The section's meeting (not cancelled), or null. */
  meeting: NotePageMeeting | null;
  /** The section's todo (not cancelled), or null. */
  todo: {item: ThreadItemRef; task: Task} | null;
  /** A loop page's tag (`loop …` keyword), or null. */
  loopTag: string | null;
}

/**
 * The section of `absPath`'s 0-based `page`; without `pages` (the page
 * index reader) only the page itself counts. A failing read reads as none.
 */
export async function sourceSectionOf(
  absPath: string,
  page: number | null,
  sources: readonly ThreadSource[],
  pages: PageIndexReader | null = null,
): Promise<SourceSection> {
  const found = await pageSectionOf(absPath, page, sources, pages);
  const claim = found.section?.claim;
  const none: SourceSection = {meeting: null, todo: null, loopTag: null};
  if (!claim) return none;
  if (claim.kind === 'loop') return {...none, loopTag: claim.tag};
  if (claim.kind !== 'entry' || claim.cancelled) return none;
  const {entry} = claim;
  if (entry.kind === 'task') return {...none, todo: {item: entry.item, task: entry.task}};
  return {...none, meeting: {item: entry.item, meetingIndex: entry.meetingIndex, meeting: entry.meeting, distance: found.distance}};
}

/** The meeting whose page (or follow-up page) `absPath`/`page` is, or null; a failing read reads as none. */
export async function meetingForNotePage(
  absPath: string,
  page: number | null,
  sources: readonly ThreadSource[],
  pages: PageIndexReader | null = null,
): Promise<NotePageMeeting | null> {
  return (await sourceSectionOf(absPath, page, sources, pages)).meeting;
}

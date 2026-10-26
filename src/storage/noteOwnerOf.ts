/**
 * Which owner and which todo the open note page stands for
 * (docs/dev/history/technical-design-engage.md §3.4, extended to the page's
 * section in docs/dev/history/technical-design-engage-page-owner.md §3.4-§3.5):
 * the Engage button's context (R2) and the todo it makes current (R3).
 *
 * The page's section (storage/pageSection.ts) decides first:
 * - a todo's page or a follow-up of it: its owner (its loop, else its thread,
 *   else its item); the todo becomes current while it is open;
 * - a meeting's or its Reflection page, or a follow-up: the meeting's owner
 *   (its thread, else its loop, else its item), and the meeting is passed on;
 * - a cancelled todo's or meeting's page: that owner only (P8);
 * - the Home page or your own heading: the notebook owner; a loop page: its
 *   loop while active, else the notebook owner.
 * Without a section the notebook owner: a home notebook's Project/Area (P1),
 * else an active loop's note's loop, else the enclosing Project/Area, else
 * none.
 */
import {EngageOwner, EngageSource, EngageTodoKey, MeetingRef, ownerHomePath, ownerOfMeeting, ownerOfTodo} from '../domain/engageOwner';
import {todayIso} from '../domain/meetingTime';
import {Notebook} from '../domain/noteSetups';
import {isHomeNotebookFile, SectionInfo, sectionTitleOf} from '../domain/pageSection';
import {findEnclosingItem, ResolvedParaPaths} from '../domain/settings';
import {errorMessage} from '../utils/errorMessage';
import {log} from '../utils/log';
import {pageSourcesOf} from './engageAggregate';
import {loopNoteOf} from './loopNotes';
import type {PageIndexReader} from './notebookPages';
import {pageSectionOf} from './pageSection';

export type NoteContextRule = 'todoNote' | 'meetingNote' | 'section' | 'loopNote' | 'item' | 'none';

export interface NoteContext {
  owner: EngageOwner | null;
  todo: EngageTodoKey | null;
  /** The meeting whose page (or follow-up page) this is; its agreed todos open the From tab. */
  meeting: MeetingRef | null;
  rule: NoteContextRule;
  /** The page's section for the section line; absent for an own note, without a section, or without the page index. */
  section?: SectionInfo;
}

function loopNoteOwner(absPath: string, source: EngageSource): EngageOwner | null {
  for (const item of source.items) {
    for (const line of item.loops) {
      if (line.status !== 'active') continue;
      try {
        if (loopNoteOf(item.path, line.tag).absolutePath === absPath) return {kind: 'loop', itemPath: item.path, tag: line.tag};
      } catch (e) {
        log('noteOwnerOf: loop note name unknown', errorMessage(e));
      }
    }
  }
  return null;
}

/** The notebook's own owner (§3.4) and the rule that found it. */
function notebookOwnerOf(
  absPath: string,
  source: EngageSource,
  paths: ResolvedParaPaths,
  notebook: Notebook | null,
): {owner: EngageOwner | null; rule: 'loopNote' | 'item' | 'none'} {
  const enclosing = findEnclosingItem(paths, absPath);
  const item = enclosing ? source.items.find(i => i.path === enclosing.path) : undefined;
  if (item && isHomeNotebookFile({absPath, itemPath: item.path, itemAbbrev: item.abbrev ?? '', notebook, today: todayIso()})) {
    return {owner: {kind: 'item', itemPath: item.path}, rule: 'item'};
  }
  const loop = loopNoteOwner(absPath, source);
  if (loop) return {owner: loop, rule: 'loopNote'};
  return item ? {owner: {kind: 'item', itemPath: item.path}, rule: 'item'} : {owner: null, rule: 'none'};
}

/** What the lookup reads beyond the cache: the Default notebook (P1) and the page index (without it, the single page). */
export interface NoteContextReads {
  notebook?: Notebook | null;
  pages?: PageIndexReader | null;
}

async function lookup(
  absPath: string,
  page: number | null,
  source: EngageSource,
  paths: ResolvedParaPaths,
  reads: NoteContextReads,
): Promise<{context: NoteContext; claim: string; cancelled: boolean}> {
  const notebook = reads.notebook ?? null;
  const found = await pageSectionOf(absPath, page, pageSourcesOf(source), reads.pages ?? null);
  const home = () => notebookOwnerOf(absPath, source, paths, notebook);
  const section = found.section;
  if (!section) {
    const {owner, rule} = home();
    return {context: {owner, todo: null, meeting: null, rule}, claim: 'none', cancelled: false};
  }
  const {claim} = section;
  let owner: EngageOwner | null;
  let todo: EngageTodoKey | null = null;
  let meeting: MeetingRef | null = null;
  let rule: NoteContextRule = 'section';
  if (claim.kind === 'entry') {
    const {entry} = claim;
    const atPage = found.distance === 0;
    if (entry.kind === 'task') {
      owner = ownerOfTodo({itemPath: entry.item.path, task: entry.task}, source);
      const open = !entry.task.done && !entry.task.cancelled;
      if (open && !claim.cancelled) todo = {itemPath: entry.item.path, taskText: entry.task.text, taskIndex: entry.taskIndex};
      if (atPage && !claim.cancelled) rule = 'todoNote';
    } else {
      owner = ownerOfMeeting({itemPath: entry.item.path, meeting: entry.meeting}, source);
      if (!claim.cancelled) meeting = {itemPath: entry.item.path, meetingIndex: entry.meetingIndex};
      if (atPage && !claim.cancelled) rule = 'meetingNote';
    }
  } else if (claim.kind === 'loop') {
    const enclosing = findEnclosingItem(paths, absPath);
    const item = enclosing ? source.items.find(i => i.path === enclosing.path) : undefined;
    const active = item?.loops.some(l => l.status === 'active' && l.tag === claim.tag);
    owner = item && active ? {kind: 'loop', itemPath: item.path, tag: claim.tag} : home().owner;
  } else {
    owner = home().owner;
  }
  const context: NoteContext = {owner, todo, meeting, rule};
  if (found.indexRead && owner) {
    // The Home page's title is the name of the item whose notebook it is.
    const enclosing = findEnclosingItem(paths, absPath);
    const homePath = enclosing?.path ?? ownerHomePath(owner);
    const homeName = source.items.find(i => i.path === homePath)?.name ?? '';
    const title = sectionTitleOf(claim, {ownerName: homeName, headingText: found.headingText, today: todayIso()});
    context.section = {page: section.page, distance: found.distance, title};
  }
  return {context, claim: claim.kind, cancelled: claim.kind === 'entry' && claim.cancelled};
}

/** The owner and current todo of the note page `absPath`/`page` (0-based). Logs which rule hit, never the path. */
export async function noteContextOf(
  absPath: string | null,
  page: number | null,
  source: EngageSource,
  paths: ResolvedParaPaths,
  reads: NoteContextReads = {},
): Promise<NoteContext> {
  if (!absPath) {
    log('noteOwnerOf: context', 'rule=none', 'owner=none', 'todo=no');
    return {owner: null, todo: null, meeting: null, rule: 'none'};
  }
  const {context, claim, cancelled} = await lookup(absPath, page, source, paths, reads);
  const base = ['noteOwnerOf: context', 'rule=' + context.rule, 'owner=' + (context.owner?.kind ?? 'none'), 'todo=' + (context.todo ? 'yes' : 'no')];
  if (context.rule === 'section') log(...(base as [string, ...string[]]), `distance=${context.section?.distance ?? 0}`, 'claim=' + claim, 'cancelled=' + (cancelled ? 'yes' : 'no'));
  else log(...(base as [string, ...string[]]));
  return context;
}

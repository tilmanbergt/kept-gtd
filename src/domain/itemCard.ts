/**
 * What the item card shows (docs/dev/history/technical-design-item-card.md K8,
 * K9, §6): the card takes Quick Add's place when a meeting or todo is tapped
 * once, in the same four rows. Which slots appear and what they say is
 * decided here; ui/itemCard/MeetingCard.tsx and TodoCard.tsx only lay them
 * out. Pure.
 */
import {formatDate, formatDayHeader} from './dateFormat';
import {titleCaseSlug} from './flowState';
import {formatMeetingWhen, todayIso} from './meetingTime';
import {MeetingTrackingKind, meetingDisplayTitle, resolveMeetingTracking} from './meetingTracking';
import {isFocusBlock} from './focusBlock';
import {loopKindsOf} from './loops';
import {meetingAutoUpdateCutoffMs} from './meetingTime';
import {isHighlight} from './monthHighlight';
import {focusBlockNoteTarget, NoteSetupConfig} from './noteSetups';
import {reflectionOffered} from './reflection';
import {parseKeywordLeadingDate} from './sharedNotePages';
import {displayTaskText, taskLabels} from './taskLabels';
import {threadOf, threadsOfTags} from './threads';
import {FlowState, Meeting, Task} from './types';

/** Whether the meeting has a reflection page: still being looked up, none, or one. */
export type ReflectionLookup = 'unknown' | 'none' | 'exists';

/** Where the meeting is in time; cancelled wins. */
export type MeetingPhase = 'before' | 'today' | 'over' | 'cancelled';

export interface MeetingCardModel {
  phase: MeetingPhase;
  /** R1: "Meeting · today", or "Focus · today" for a focus block. */
  heading: string;
  /** A focus block (`#focusblock`): F on, no P/R, no Reflect (docs/dev/history/technical-design-time-and-place.md §3.1). */
  focusBlock: boolean;
  /** R1: the meeting's thread (`#sparring/jordan`), opening its overview; a focus block's loop reads "writing novel ›"; null without a nested tag. */
  thread: {tag: string; label: string} | null;
  /** R2: the title as shown (state tags stripped, the user's tags kept). */
  title: string;
  /** R2: "Thu 22.10. 10:00-11:00", or "today 10:00-11:00". */
  when: string;
  /** R3: the P or R toggle when the setup tracks the current phase. */
  checkpoint: {kind: MeetingTrackingKind; done: boolean; label: 'P' | 'R'} | null;
  /** R3: the M toggle's state. */
  monthly: boolean;
  /**
   * R3: whether the meeting has its note yet (open) or not (create); a focus
   * block whose note no setup places opens the owner's home notebook (`home`)
   * or has no note action (null) - domain/noteSetups.ts's focusBlockNoteTarget.
   */
  note: 'open' | 'create' | 'home' | null;
  /** R3: Reflect once the meeting is over (not cancelled); filled once the page exists, inactive while looked up. */
  reflection: ReflectionLookup | null;
  /** R3: the linked file (name opens, ✕ unlinks), "+clip" where the screen can link, or nothing. */
  file: {kind: 'linked'; path: string; name: string} | {kind: 'link'} | null;
  /** R4: the area chip - the owner's name, and whether its arrow can refile. */
  owner: {name: string; canRefile: boolean};
  /** R4: Cancel meeting, unless it already is. */
  canCancel: boolean;
}

export interface MeetingCardInput {
  meeting: Meeting;
  setups: NoteSetupConfig;
  nowMs: number;
  reflection: ReflectionLookup;
  /** The Project's or Area's name, or "Inbox". */
  ownerName: string;
  /** The screen has a Files pane to link a file through. */
  canLink: boolean;
  /** The screen can refile (a Files pane to pick the target in). */
  canRefile: boolean;
  /** An Inbox meeting (a focus block there has no note action). */
  inbox?: boolean;
}

const PHASE_TEXT: Record<MeetingPhase, string> = {before: 'ahead', today: 'today', over: 'over', cancelled: 'cancelled'};
const CHECKPOINT_LABEL: Record<MeetingTrackingKind, 'P' | 'R'> = {prep: 'P', review: 'R'};

export function meetingPhase(meeting: Meeting, nowMs: number): MeetingPhase {
  if (meeting.cancelled) return 'cancelled';
  if (nowMs > meetingAutoUpdateCutoffMs(meeting)) return 'over';
  return meeting.date === todayIso(new Date(nowMs)) ? 'today' : 'before';
}

/** The last path segment of a linked file, without its folders. */
function fileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function meetingCardModel(input: MeetingCardInput): MeetingCardModel {
  const {meeting, nowMs} = input;
  const phase = meetingPhase(meeting, nowMs);
  const today = todayIso(new Date(nowMs));
  const tracking = phase === 'cancelled' ? null : resolveMeetingTracking(meeting, input.setups, new Date(nowMs));
  const thread = threadsOfTags(meeting.tags)[0] ?? null;
  const focusBlock = isFocusBlock(meeting);
  // A focus block's loop is named like the loop overview does: kind and name, without '#'.
  const loopLink = focusBlock && thread && loopKindsOf(input.setups.setups).includes(thread.type);
  const noteTarget = focusBlock && !meeting.notePath ? focusBlockNoteTarget(meeting, input.setups.setups, input.inbox === true) : 'meeting';
  return {
    phase,
    heading: `${focusBlock ? 'Focus' : 'Meeting'} · ${PHASE_TEXT[phase]}`,
    focusBlock,
    thread: thread ? {tag: thread.tag, label: loopLink ? `${thread.type} ${thread.counterpart} ›` : `#${thread.tag} ›`} : null,
    title: meetingDisplayTitle(meeting),
    when: `${meeting.date === today ? 'today' : formatDayHeader(meeting.date, today)} ${formatMeetingWhen(meeting)}`,
    checkpoint: tracking ? {kind: tracking.kind, done: tracking.done, label: CHECKPOINT_LABEL[tracking.kind]} : null,
    monthly: isHighlight(meeting),
    note: meeting.notePath ? 'open' : noteTarget === 'meeting' ? 'create' : noteTarget === 'home' ? 'home' : null,
    reflection: phase === 'over' && reflectionOffered(meeting, nowMs) ? input.reflection : null,
    file: meeting.linkedFile
      ? {kind: 'linked', path: meeting.linkedFile, name: fileName(meeting.linkedFile)}
      : input.canLink
        ? {kind: 'link'}
        : null,
    owner: {name: input.ownerName, canRefile: input.canRefile},
    canCancel: phase !== 'cancelled',
  };
}

export interface TodoCardModel {
  /** R1: "Todo · due 24.10.", "· waiting for Lena", "· next", "· done". */
  heading: string;
  /** R1: the meeting the todo was agreed in ("↳ Sparring Jordan ›"), opening its thread's overview when the meeting has a thread tag. */
  origin: {label: string; threadTag: string | null} | null;
  /** R2: the title without the tags its labels show, and the labels (`#next`, `#due 24.10.`). */
  title: string;
  labels: string[];
  /** R3: the checkbox and the flow chips' value. */
  done: boolean;
  flowState: FlowState;
  note: 'open' | 'create';
  /** R4: the area chip, the linked file or +clip, delete unless already deleted. */
  owner: {name: string; canRefile: boolean};
  file: {kind: 'linked'; path: string; name: string} | {kind: 'link'} | null;
  canDelete: boolean;
}

export interface TodoCardInput {
  task: Task;
  today: string;
  ownerName: string;
  canLink: boolean;
  canRefile: boolean;
}

/** What R1 says after "Todo · ": done or deleted first, then the due date, then the flow state. */
function todoStatus(task: Task, today: string): string {
  if (task.cancelled) return 'deleted';
  if (task.done) return 'done';
  if (task.dueDate) {
    if (task.dueDate === today) return 'due today';
    return `${task.dueDate < today ? 'overdue' : 'due'} ${formatDate(task.dueDate, today)}`;
  }
  if (task.flowState === 'waiting-for') return task.waitingOn ? `waiting for ${titleCaseSlug(task.waitingOn)}` : 'waiting';
  return task.flowState ?? 'open';
}

/** The meeting a provenance key (`2026-10-14 Sparring Jordan sparring/jordan`) names: its title words, and its first thread tag. */
export function originOfKey(key: string): {label: string; threadTag: string | null} | null {
  const words = key.split(' ').filter(Boolean);
  if (words.length === 0) return null;
  const date = parseKeywordLeadingDate(key);
  const rest = date ? words.slice(1) : words;
  const threadTag = rest.map(word => threadOf(word)?.tag).find((tag): tag is string => !!tag) ?? null;
  const title = rest.filter(word => !threadOf(word)).join(' ') || rest.join(' ');
  return title ? {label: `↳ ${title}`, threadTag} : null;
}

export function todoCardModel(input: TodoCardInput): TodoCardModel {
  const {task, today} = input;
  const origin = task.fields.meeting ? originOfKey(task.fields.meeting) : null;
  return {
    heading: `Todo · ${todoStatus(task, today)}`,
    origin: origin ? {label: origin.threadTag ? `${origin.label} ›` : origin.label, threadTag: origin.threadTag} : null,
    title: displayTaskText(task, 'flat'),
    labels: taskLabels(task, 'flat', today).map(label => label.text),
    done: task.done,
    flowState: task.flowState,
    note: task.notePath ? 'open' : 'create',
    owner: {name: input.ownerName, canRefile: input.canRefile},
    file: task.linkedFile
      ? {kind: 'linked', path: task.linkedFile, name: fileName(task.linkedFile)}
      : input.canLink
        ? {kind: 'link'}
        : null,
    canDelete: !task.cancelled,
  };
}

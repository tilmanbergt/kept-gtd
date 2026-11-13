/**
 * What the item card shows (docs/dev/history/technical-design-item-card.md K8,
 * K9, §6): the card takes Quick Add's place when a meeting or todo is tapped
 * once, in the same four rows. Which slots appear and what they say is
 * decided here; ui/itemCard/MeetingCard.tsx and TodoCard.tsx only lay them
 * out. Pure.
 *
 * One page for acting on the item (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.6, C1, §11 G9, G10): R1 the kind, the place's abbreviation (a link), the refile arrow
 * and the state - a todo's flow state and due date, a meeting's date and time; R2-R3 the title
 * over two lines with the origin or thread at its foot; R4 the states on the left and the
 * actions on the right - everything visible at once, no More ›. Delete and Cancel meeting live
 * only here (C2). `todoCardLayout` and `meetingCardLayout` say which buttons show.
 */
import {formatDate, formatDayHeader} from './dateFormat';
import {titleCaseSlug} from './flowState';
import {formatMeetingWhen, todayIso} from './meetingTime';
import {MeetingTrackingKind, meetingDisplayTitle, resolveMeetingTracking} from './meetingTracking';
import {isFocusBlock} from './focusBlock';
import {loopKindsOf} from './loops';
import {meetingAutoUpdateCutoffMs, meetingStartMs} from './meetingTime';
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
  /** R1: "Thu 22.10. 10:00-11:00", or "today 10:00-11:00". */
  when: string;
  /** R1 on a narrow box: no weekday, no end - "22.10. 10:00", "today 10:00". */
  whenShort: string;
  /** R1: the place's abbreviation in capitals, else its name. */
  place: string;
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
  /** The owner's name, and whether R1's arrow can refile. */
  owner: {name: string; canRefile: boolean};
  /** R4: Cancel meeting - only before it starts. */
  canCancel: boolean;
  /** The compact card's R1: "Meeting · Coaching · today". */
  caption: string;
  /** R1 in parts: "Meeting" or "Focus", and the state after the owner ("today"). */
  kind: string;
  status: string;
  /** The compact card's R3: the thread, else the linked file, else "no note yet", else nothing. */
  detail: CardDetail | null;
}

/** The compact card's one detail line (R3 of its first page). */
export type CardDetail =
  | {kind: 'origin'; label: string; threadTag: string | null}
  | {kind: 'thread'; label: string; tag: string}
  | {kind: 'file'; name: string}
  | {kind: 'noNote'};

export type TodoCardButton = 'done' | 'waiting' | 'someday' | 'note' | 'next' | 'maybe' | 'file' | 'delete';
/** `empty`: Cancel meeting's square once the meeting has started - kept, so nothing moves. */
export type MeetingCardButton = 'checkpoint' | 'note' | 'reflect' | 'monthly' | 'focus' | 'file' | 'newFromThis' | 'cancel' | 'empty';

/** R4 of a card: the states on the left, the actions on the right (§11 G9, G10). */
export interface CardLayout<B> {
  row4Left: B[];
  row4Right: B[];
}

export interface MeetingCardInput {
  meeting: Meeting;
  setups: NoteSetupConfig;
  nowMs: number;
  reflection: ReflectionLookup;
  /** The Project's or Area's name, or "Inbox". */
  ownerName: string;
  /** Its abbreviation, shown in capitals in its name's place (§11 G10). */
  ownerAbbrev?: string | null;
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
    whenShort: `${meeting.date === today ? 'today' : formatDate(meeting.date, today)} ${meeting.time || formatMeetingWhen(meeting)}`,
    place: placeLabel(input.ownerName, input.ownerAbbrev),
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
    canCancel: (phase === 'before' || phase === 'today') && nowMs < meetingStartMs(meeting),
    caption: `${focusBlock ? 'Focus' : 'Meeting'} · ${input.ownerName} · ${PHASE_TEXT[phase]}`,
    kind: focusBlock ? 'Focus' : 'Meeting',
    status: PHASE_TEXT[phase],
    detail: thread
      ? {kind: 'thread', tag: thread.tag, label: loopLink ? `${thread.type} ${thread.counterpart} ›` : `#${thread.tag} ›`}
      : meeting.linkedFile
        ? {kind: 'file', name: fileName(meeting.linkedFile)}
        : !meeting.notePath && noteTarget === 'meeting'
          ? {kind: 'noNote'}
          : null,
  };
}

/** The place on R1: its abbreviation in capitals, else its name (§11 G9, G10). */
function placeLabel(name: string, abbrev: string | null | undefined): string {
  return abbrev ? abbrev.toUpperCase() : name;
}

/** R1's state after the place (§11 G10): the date and time, then `· over` or `· cancelled`. */
export function meetingCardState(model: MeetingCardModel, narrow: boolean): string {
  const when = narrow ? model.whenShort : model.when;
  return model.phase === 'over' || model.phase === 'cancelled' ? `${when} · ${PHASE_TEXT[model.phase]}` : when;
}

/** Which buttons the meeting card's R4 shows (§11 G10): P/R · M · F · Reflect, then the notebook · 📎 · New from this · ⊘. */
export function meetingCardLayout(model: MeetingCardModel, canNewFromThis = true): CardLayout<MeetingCardButton> {
  const row4Left: MeetingCardButton[] = [];
  if (model.checkpoint) row4Left.push('checkpoint');
  row4Left.push('monthly', 'focus');
  if (model.reflection) row4Left.push('reflect');
  const row4Right: MeetingCardButton[] = [];
  if (model.note) row4Right.push('note');
  if (model.file) row4Right.push('file');
  if (canNewFromThis) row4Right.push('newFromThis');
  row4Right.push(model.canCancel ? 'cancel' : 'empty');
  return {row4Left, row4Right};
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
  /** The owner's name, and whether R1's arrow can refile; R4 the linked file or +clip, delete unless already deleted. */
  owner: {name: string; canRefile: boolean};
  /** R1: the place's abbreviation in capitals, else its name. */
  place: string;
  file: {kind: 'linked'; path: string; name: string} | {kind: 'link'} | null;
  canDelete: boolean;
  /** The compact card's R1: "Todo · Garden renovation · due 5.11.". */
  caption: string;
  /** R1's state after the owner: "next · due 5.11.", "waiting for Lena", "open". */
  status: string;
  /** The compact card's R3: where it was agreed, else the linked file, else "no note yet", else nothing. */
  detail: CardDetail | null;
}

export interface TodoCardInput {
  task: Task;
  today: string;
  ownerName: string;
  /** Its abbreviation, shown in capitals in its name's place (§11 G9). */
  ownerAbbrev?: string | null;
  canLink: boolean;
  canRefile: boolean;
  /**
   * The todo's `[source::]` as the screen resolved it (§3.7): the todo whose note it is, or the
   * note's name; `open` when a tap can open the note.
   */
  source?: {label: string; open: boolean} | null;
}

/**
 * What R1 says after the place (§11 G9): deleted or done, else the active flow state and the due
 * date (`next · due 5.11.`), else `open`. Shown here only, not again under the title.
 */
function todoStatus(task: Task, today: string): string {
  if (task.cancelled) return 'deleted';
  if (task.done) return 'done';
  const parts: string[] = [];
  if (task.flowState === 'waiting-for') parts.push(task.waitingOn ? `waiting for ${titleCaseSlug(task.waitingOn)}` : 'waiting');
  else if (task.flowState) parts.push(task.flowState);
  if (task.dueDate) {
    if (task.dueDate === today) parts.push('due today');
    else parts.push(`${task.dueDate < today ? 'overdue' : 'due'} ${formatDate(task.dueDate, today)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'open';
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
  const meetingOrigin = task.fields.meeting ? originOfKey(task.fields.meeting) : null;
  // One origin per todo (docs/dev/history/technical-design-quickadd-redesign.md §3.7): the meeting, else the source note.
  const origin = meetingOrigin ?? (input.source ? {label: `↳ ${input.source.label}`, threadTag: null} : null);
  const originOpens = meetingOrigin ? !!meetingOrigin.threadTag : !!input.source?.open;
  return {
    heading: `Todo · ${todoStatus(task, today)}`,
    origin: origin ? {label: originOpens ? `${origin.label} ›` : origin.label, threadTag: origin.threadTag} : null,
    title: displayTaskText(task, 'flat'),
    labels: taskLabels(task, 'flat', today).map(label => label.text),
    done: task.done,
    flowState: task.flowState,
    note: task.notePath ? 'open' : 'create',
    owner: {name: input.ownerName, canRefile: input.canRefile},
    place: placeLabel(input.ownerName, input.ownerAbbrev),
    file: task.linkedFile
      ? {kind: 'linked', path: task.linkedFile, name: fileName(task.linkedFile)}
      : input.canLink
        ? {kind: 'link'}
        : null,
    canDelete: !task.cancelled,
    caption: `Todo · ${input.ownerName} · ${todoStatus(task, today)}`,
    status: todoStatus(task, today),
    detail: origin
      ? {kind: 'origin', label: originOpens ? `${origin.label} ›` : origin.label, threadTag: origin.threadTag}
      : task.linkedFile
        ? {kind: 'file', name: fileName(task.linkedFile)}
        : !task.notePath
          ? {kind: 'noNote'}
          : null,
  };
}

/** Which buttons the todo card's R4 shows (§11 G9): the done box, Next · w/f · Someday · Maybe, then the notebook · 📎 · 🗑. */
export function todoCardLayout(model: TodoCardModel): CardLayout<TodoCardButton> {
  const row4Right: TodoCardButton[] = ['note'];
  if (model.file) row4Right.push('file');
  if (model.canDelete) row4Right.push('delete');
  return {row4Left: ['done', 'next', 'waiting', 'someday', 'maybe'], row4Right};
}

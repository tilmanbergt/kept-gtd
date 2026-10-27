/**
 * The context panel of a tapped meeting or focus block
 * (docs/dev/history/technical-design-time-and-place.md §3.2, D11-D13): one
 * stacked list - I owe · Next · Waiting for · Agreed last time / From its
 * meetings / Agreed here - built from Engage's owner logic, never a rule of
 * its own: `ownerOfMeeting` names the owner, `optionsOf` (with the meeting as
 * Engage's page, `engagePageOf`) gives the lists. Pure.
 *
 * - Thread or loop owner (`owner`): I owe = its `#next` and plan todos that
 *   relate as "owe" (already first in Engage's order); Next = the other
 *   `#next` todos (`#now` counts as `#next`), then its plan todos - an agenda
 *   item added before the meeting has no flow state and must show; Waiting for = Engage's Waiting;
 *   the newest From group as "Agreed last time" (thread) or "From its
 *   meetings" (loop).
 * - Plain meeting (owner kind `item`, `this-meeting`): only what is linked to
 *   this meeting - the todos and agreements agreed in it ("Agreed here") and
 *   open todos carrying one of its own tags. With nothing linked
 *   (`owner-lens`): the Project's or Area's Next and Waiting for, and the
 *   panel says so.
 * - An Inbox meeting has no owner: `this-meeting` with nothing listed.
 * Due dates are the rows' labels; sections without rows are left out by the
 * panel.
 */
import {EngageOwner, EngageSource, MeetingEntryRef, ownerOfMeeting, ownerTitle, OwnerTitle, OwnerTodoRef} from './engageOwner';
import {engagePageOf, FromGroup, optionsOf} from './engageOptions';
import {isContextTag, isSomedayMaybe} from './flowState';

export type MeetingContextMode = 'owner' | 'this-meeting' | 'owner-lens';
export type AgreedCaption = 'Agreed last time' | 'From its meetings' | 'Agreed here';

export interface MeetingContextModel {
  owner: EngageOwner | null;
  ownerTitle: OwnerTitle | null;
  mode: MeetingContextMode;
  owe: OwnerTodoRef[];
  next: OwnerTodoRef[];
  waiting: OwnerTodoRef[];
  agreed: {caption: AgreedCaption; group: FromGroup} | null;
}

/** The info line of the owner's lens (D13). */
export const OWNER_LENS_LINE = 'Nothing linked to this meeting yet · showing its';

const sameMeeting = (a: MeetingEntryRef, b: MeetingEntryRef) => a.item.path === b.item.path && a.meetingIndex === b.meetingIndex;

export function meetingContextOf(entry: MeetingEntryRef, source: EngageSource, nowMs: number): MeetingContextModel {
  const owner = entry.item.kind === 'inbox' ? null : ownerOfMeeting({itemPath: entry.item.path, meeting: entry.meeting}, source);
  if (!owner) return {owner: null, ownerTitle: null, mode: 'this-meeting', owe: [], next: [], waiting: [], agreed: null};
  const page = engagePageOf({itemPath: entry.item.path, meetingIndex: entry.meetingIndex}, source, nowMs);
  const options = optionsOf(owner, source, nowMs, null, page);
  const title = ownerTitle(owner, source);

  if (owner.kind !== 'item') {
    const owe = [...options.next, ...options.plan].filter(t => t.relation === 'owe');
    const newest = options.from[0] ?? null;
    return {
      owner,
      ownerTitle: title,
      mode: 'owner',
      owe,
      next: [...options.next, ...options.plan].filter(t => t.relation !== 'owe'),
      waiting: options.waiting,
      agreed: newest ? {caption: owner.kind === 'thread' ? 'Agreed last time' : 'From its meetings', group: newest} : null,
    };
  }

  // A plain meeting: what is linked to it.
  const here = options.from.find(g => sameMeeting(g.meeting, entry)) ?? null;
  const ownTags = entry.meeting.tags.filter(tag => isContextTag(tag) && tag.toLowerCase() !== (entry.item.abbrev ?? '').toLowerCase());
  const linkedByTag =
    ownTags.length === 0
      ? []
      : [...options.next, ...options.plan, ...options.waiting].filter(t => !isSomedayMaybe(t.task) && t.task.tags.some(tag => ownTags.includes(tag)));
  if (here || linkedByTag.length > 0) {
    return {
      owner,
      ownerTitle: title,
      mode: 'this-meeting',
      owe: [],
      next: linkedByTag.filter(t => t.task.flowState !== 'waiting-for'),
      waiting: linkedByTag.filter(t => t.task.flowState === 'waiting-for'),
      agreed: here ? {caption: 'Agreed here', group: here} : null,
    };
  }
  return {owner, ownerTitle: title, mode: 'owner-lens', owe: [], next: options.next, waiting: options.waiting, agreed: null};
}

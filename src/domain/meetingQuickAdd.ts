/**
 * What Quick Add adds to the entries it creates for a meeting
 * (docs/dev/history/technical-design-time-and-place.md §3.2, D14;
 * docs/dev/history/technical-design-meetings-0.21.md R7, R20): Engage on a
 * meeting's page and "+ Quick Add to meeting" in the context panel use the
 * same rule.
 *
 * - The owner's tag for a thread or loop owner (`#<tag>`), at every moment:
 *   before the meeting that makes the todo an agenda item.
 * - The meeting itself as provenance (`[meeting:: …]`) once it has started:
 *   During and After - what is agreed in it.
 * - A plain meeting (owner kind `item`) gets no tag; before it starts nothing
 *   is added, the entry is only filed to its Project or Area (§9.7).
 */
import {EngageOwner} from './engageOwner';
import {MeetingMoment} from './meetingMoment';
import {Meeting} from './types';

export interface QuickAddParts {
  /** The tag every new entry gets (without '#'), or null. */
  presetTag: string | null;
  /** The meeting a new todo or agreement records as provenance, or null. */
  provenance: Meeting | null;
}

export function quickAddPartsFor(owner: EngageOwner | null, meeting: Meeting | null, moment: MeetingMoment | null): QuickAddParts {
  return {
    presetTag: owner && owner.kind !== 'item' ? owner.tag : null,
    provenance: meeting && moment && moment !== 'before' ? meeting : null,
  };
}

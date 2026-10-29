/**
 * "+ Quick Add to meeting" (docs/dev/history/technical-design-time-and-place.md §3.2, D14):
 * Quick Add's create mode for the selected meeting, with the parts Engage
 * uses (domain/meetingQuickAdd.ts) - the thread's or loop's tag, and the
 * meeting as provenance once it has started - each with its ✕ in the grey
 * line. Entries go to the meeting's Project or Area (the Inbox for an Inbox
 * meeting). After a successful add, `onAdded` returns the screen to the card;
 * the panel shows the new row through the cache.
 */
import {Destination} from '../../domain/destination';
import {EngageOwner, MeetingEntryRef} from '../../domain/engageOwner';
import {titleWithLoopTag} from '../../domain/loopEdit';
import {momentByTime} from '../../domain/meetingMoment';
import {quickAddPartsFor} from '../../domain/meetingQuickAdd';
import {QuickAddAdds} from '../quickAdd/ProvenanceLine';
import {usePresetTag} from '../quickAdd/usePresetTag';
import {useProvenance} from '../quickAdd/useProvenance';
import {MeetingQuickAddFields} from '../QuickAddWidget';

export interface MeetingQuickAdd {
  provenance: QuickAddAdds;
  destination: Destination;
  onAddTask: (line: string, destination: Destination, linkedFile?: string) => Promise<void>;
  onAddMeeting: (fields: MeetingQuickAddFields, destination: Destination, linkedFile?: string) => Promise<void>;
}

export function useMeetingQuickAdd(
  entry: MeetingEntryRef | null,
  /** The panel's owner (useMeetingContext's model). */
  owner: EngageOwner | null,
  base: {
    addTask: (line: string, destination: Destination, linkedFile?: string) => Promise<void>;
    addMeeting: (fields: MeetingQuickAddFields, destination: Destination, linkedFile?: string) => Promise<void>;
  },
  onAdded: () => void,
): MeetingQuickAdd | null {
  const parts = quickAddPartsFor(owner, entry?.meeting ?? null, entry ? momentByTime(entry.meeting, Date.now()) : null);
  const preset = usePresetTag(parts.presetTag);
  const origin = useProvenance(parts.provenance);
  if (!entry) return null;
  const destination: Destination =
    entry.item.kind === 'inbox' ? {type: 'inbox'} : {type: 'item', kind: entry.item.kind, name: entry.item.name, path: entry.item.path};
  return {
    provenance: [...(origin.provenance ?? []), ...(preset.part ? [preset.part] : [])],
    destination,
    onAddTask: async (line, to, linkedFile) => {
      await base.addTask(preset.apply(origin.apply(line)), to, linkedFile);
      origin.added();
      preset.added();
      onAdded();
    },
    onAddMeeting: async (fields, to, linkedFile) => {
      await base.addMeeting(parts.presetTag ? {...fields, title: titleWithLoopTag(fields.title, parts.presetTag)} : fields, to, linkedFile);
      onAdded();
    },
  };
}

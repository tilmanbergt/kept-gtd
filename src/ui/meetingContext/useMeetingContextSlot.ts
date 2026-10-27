/**
 * One screen's context panel wiring (docs/dev/history/technical-design-time-and-place.md §3.2):
 * the selected meeting as Engage's entry, the panel's model, and Quick Add's
 * props for its slot - in `add` mode the meeting's parts, destination and add
 * handlers, otherwise the screen's own. Daily, Week and Month (and so
 * Review's Week ahead) use it; the screen keeps its layout.
 */
import {useMemo} from 'react';
import {Destination} from '../../domain/destination';
import {MeetingEntryRef} from '../../domain/engageOwner';
import {GtdParaSettings} from '../../domain/settings';
import {Meeting} from '../../domain/types';
import {CachedItem} from '../../storage/dataCache';
import {ProjectFileState} from '../../storage/projectFile';
import {QuickAddAdds} from '../quickAdd/ProvenanceLine';
import {MeetingQuickAddFields} from '../QuickAddWidget';
import {EditMode} from '../useEditTarget';
import {useStableCallback} from '../useStableCallback';
import {useMeetingContext, MeetingContextData} from './useMeetingContext';
import {useMeetingQuickAdd} from './useMeetingQuickAdd';

type SelectedMeeting = {item: MeetingEntryRef['item']; meetingIndex: number; meeting: Meeting};

interface Base {
  addTask: (line: string, destination: Destination) => Promise<void>;
  addMeeting: (fields: MeetingQuickAddFields, destination: Destination) => Promise<void>;
}

export interface MeetingContextSlot extends MeetingContextData {
  entry: MeetingEntryRef | null;
  /** Quick Add shows for the selected meeting. */
  adding: boolean;
  /** Quick Add's props for the slot. */
  widget: {fixedDestination: Destination; provenance: QuickAddAdds | undefined; onAddTask: Base['addTask']; onAddMeeting: Base['addMeeting']};
}

export function useMeetingContextSlot(
  selected: SelectedMeeting | null,
  data: {items: readonly CachedItem[]; inbox: ProjectFileState | null; inboxPath: string | null; settings: GtdParaSettings | null},
  mode: EditMode,
  base: Base,
  screenDestination: Destination,
  toCard: () => void,
): MeetingContextSlot {
  const entry = useMemo(
    () => (selected ? {item: {kind: selected.item.kind, name: selected.item.name, path: selected.item.path, abbrev: selected.item.abbrev}, meetingIndex: selected.meetingIndex, meeting: selected.meeting} : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.item.path, selected?.meetingIndex, selected?.meeting],
  );
  const context = useMeetingContext(entry, data);
  const add = useMeetingQuickAdd(entry, context.model?.owner ?? null, base, toCard);
  const adding = mode === 'add' && add !== null;
  // Stable for the memoized QuickAddWidget; called from its handlers only.
  const onAddTask = useStableCallback((line: string, destination: Destination) => (adding && add ? add.onAddTask(line, destination) : base.addTask(line, destination)));
  const onAddMeeting = useStableCallback((fields: MeetingQuickAddFields, destination: Destination) =>
    adding && add ? add.onAddMeeting(fields, destination) : base.addMeeting(fields, destination),
  );
  return {
    ...context,
    entry,
    adding,
    widget: {
      fixedDestination: adding && add ? add.destination : screenDestination,
      provenance: adding && add ? add.provenance : undefined,
      onAddTask,
      onAddMeeting,
    },
  };
}

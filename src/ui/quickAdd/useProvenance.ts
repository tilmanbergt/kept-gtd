/**
 * The provenance a screen writes into the todos it adds from Quick Add
 * (docs/dev/history/technical-design-tending-threads.md §3.4): the meeting
 * they were agreed in, as `[meeting:: key]` - no tags. Used by Review's "Meetings to
 * close out", the thread overview and capture from a meeting's note page.
 *
 * `provenance` is Quick Add's grey line; its ✕ drops the provenance for the
 * next todo only - after a successful add (`added`) or for another meeting it
 * is on again. `apply` turns Quick Add's composed line into the line to save.
 */
import {useState} from 'react';
import {todayIso} from '../../domain/meetingTime';
import {applyProvenance, applySource, meetingKey, provenanceLabel, sourceLabel} from '../../domain/provenance';
import {Meeting} from '../../domain/types';
import {QuickAddAdds, QuickAddPart} from './ProvenanceLine';

type ProvenanceMeeting = Pick<Meeting, 'date' | 'title' | 'tags'>;

export interface ProvenanceState {
  /** Quick Add's grey line: one part, or null. */
  provenance: QuickAddAdds | null;
  /** True while the line is shown (not dropped, a meeting is known). */
  active: boolean;
  /** The `[meeting::]` key while active (an agreement records it, ui/useAgreementActions.ts); else null. */
  key: string | null;
  apply: (composedLine: string) => string;
  /** Call after a todo was added: the next one gets the provenance again. */
  added: () => void;
}

export function useProvenance(meeting: ProvenanceMeeting | null): ProvenanceState {
  const [droppedKey, setDroppedKey] = useState<string | null>(null);
  const key = meeting ? meetingKey(meeting) : null;
  const active = meeting !== null && key !== droppedKey;
  return {
    provenance: active && meeting ? [{key: 'provenance', label: provenanceLabel(meeting, todayIso()), onClear: () => setDroppedKey(key)}] : null,
    active,
    key: active ? key : null,
    apply: line => (active && key ? applyProvenance(line, key) : line),
    added: () => setDroppedKey(null),
  };
}

/** The note origin of a new todo (`[source::]`, docs/dev/history/technical-design-quickadd-redesign.md §3.7). */
export interface SourceState {
  /** Quick Add's grey line part (`↳ from Ideas`, ✕ drops it for this todo), or null. */
  part: QuickAddPart | null;
  apply: (composedLine: string) => string;
  /** After a todo was added: the next one gets the source again. */
  added: () => void;
}

/** The note a todo is written in, as its source - `key` from domain/provenance.ts's `sourceKey`, null for none. */
export function useSource(key: string | null): SourceState {
  const [dropped, setDropped] = useState<string | null>(null);
  const active = key !== null && key !== dropped;
  return {
    part: active && key ? {key: 'source', label: sourceLabel(key), onClear: () => setDropped(key)} : null,
    apply: line => (active && key ? applySource(line, key) : line),
    added: () => setDropped(null),
  };
}

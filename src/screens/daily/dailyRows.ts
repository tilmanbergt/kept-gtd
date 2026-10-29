/**
 * Daily's row keys and the flattened Next todos list
 * (docs/dev/history/technical-design-daily-slim.md §3.1): a group's header row
 * counts as content in the one paged sequence
 * (docs/dev/history/technical-design-pagination-edit-reuse.md §2/§4).
 */
import {DailyItemRef, DailyMeetingEntry, DailyTaskEntry, DailyTaskGroup} from '../../storage/dailyAggregate';

/** Edit keys are `<item path>#<index>`, the same as ui/useEntryActions.ts's. */
export const taskKey = (entry: DailyTaskEntry) => `${entry.item.path}#${entry.taskIndex}`;
export const meetingKey = (entry: DailyMeetingEntry) => `${entry.item.path}#${entry.meetingIndex}`;

/** The column width the line estimators use (design-device-rendering.md §1). */
export const COLUMN_WIDTH_PX = 678;
/** A group header's budget; it renders at its natural height (design-device-rendering.md §3). */
export const GROUP_HEADER_ROW_PX = 57;

export type FlatTaskRow = {kind: 'header'; item: DailyItemRef} | {kind: 'entry'; entry: DailyTaskEntry};

export function flattenTaskGroups(groups: DailyTaskGroup[]): FlatTaskRow[] {
  const rows: FlatTaskRow[] = [];
  for (const group of groups) {
    rows.push({kind: 'header', item: group.item});
    for (const entry of group.entries) rows.push({kind: 'entry', entry});
  }
  return rows;
}

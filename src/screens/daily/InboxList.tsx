/**
 * The Inbox as one list (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): Daily's Inbox tab and the Review's "Inbox to zero" step. First the
 * marks card (ui/MarksCard.tsx, all marks) while there are open marks, then
 * the open Inbox todos (domain/inboxCount.ts), then the Inbox meetings, past
 * ones included - file order, the context never hiding anything. The screen
 * builds each row (`renderTodo`, `renderMeeting`), so its actions stay where
 * its state is.
 */
import React from 'react';
import {MarkScope} from '../../domain/marks';
import {DailyMeetingEntry, DailyTaskEntry} from '../../storage/dailyAggregate';
import MarksCard, {MARKS_CARD_H} from '../../ui/MarksCard';
import {MarksReturnTo} from '../../ui/marksNav';
import {MEETING_ROW_HEIGHT} from '../../ui/MeetingRow';
import PagedSection from '../../ui/PagedSection';
import {estimatorWidth} from '../../ui/ScreenSize';
import {taskRowHeight} from '../../ui/TaskRow';

export type InboxRow = {kind: 'marks'} | {kind: 'todo'; entry: DailyTaskEntry} | {kind: 'meeting'; entry: DailyMeetingEntry};

/** The marks card's row: its height and its top margin. */
const MARKS_ROW_PX = MARKS_CARD_H + 8;

export const ALL_MARKS: MarkScope = {type: 'all'};

/** The rows in order: marks, todos, meetings. */
export function inboxRows(openMarks: number, todos: readonly DailyTaskEntry[], meetings: readonly DailyMeetingEntry[]): InboxRow[] {
  return [
    ...(openMarks > 0 ? [{kind: 'marks'} as InboxRow] : []),
    ...todos.map((entry): InboxRow => ({kind: 'todo', entry})),
    ...meetings.map((entry): InboxRow => ({kind: 'meeting', entry})),
  ];
}

export function inboxRowHeight(row: InboxRow): number {
  if (row.kind === 'marks') return MARKS_ROW_PX;
  if (row.kind === 'meeting') return MEETING_ROW_HEIGHT.oneLine;
  return taskRowHeight(row.entry.task, estimatorWidth(), 'inbox');
}

interface Props {
  rows: InboxRow[];
  renderTodo: (entry: DailyTaskEntry, heightPx: number) => React.ReactNode;
  renderMeeting: (entry: DailyMeetingEntry) => React.ReactNode;
  /** Where the marks screen's Close comes back to. */
  marksReturnTo: MarksReturnTo;
  /** The list's remembered height (ui/PagedSection.tsx `heightKey`). */
  heightKey: string;
  textColor: string;
  borderColor: string;
}

function InboxList({rows, renderTodo, renderMeeting, marksReturnTo, heightKey, textColor, borderColor}: Props): React.JSX.Element {
  return (
    <PagedSection
      header=""
      rows={rows}
      rowHeight={inboxRowHeight}
      heightKey={heightKey}
      isCountableRow={row => row.kind !== 'marks'}
      renderRow={row =>
        row.kind === 'marks' ? (
          <MarksCard key="marks" scope={ALL_MARKS} returnTo={marksReturnTo} textColor={textColor} borderColor={borderColor} />
        ) : row.kind === 'todo' ? (
          renderTodo(row.entry, inboxRowHeight(row))
        ) : (
          renderMeeting(row.entry)
        )
      }
      emptyHint="Inbox zero."
      textColor={textColor}
      borderColor={borderColor}
    />
  );
}

export default React.memo(InboxList);

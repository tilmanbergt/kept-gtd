/**
 * The edit-form state of Quick Add (ui/QuickAddWidget.tsx): what an edit of
 * a todo or a meeting holds while it is open, and how it is loaded from the
 * stored item. Kept apart from the widget so the widget stays within its
 * size budget (DEVELOPMENT-POLICY §3).
 */
import {Agreement} from '../../domain/agreements';
import {formatMeetingWhen} from '../../domain/meetingTime';
import {isFocusBlock, setFocusBlock} from '../../domain/focusBlock';
import {isHighlight, setHighlight} from '../../domain/monthHighlight';
import {stripTrackingTags} from '../../domain/meetingTracking';
import {FlowState, Meeting, Task} from '../../domain/types';

export interface TaskEditFields {
  text: string;
  flowState: FlowState;
  waitingOnText: string;
  dueDate: string;
  dueDateOpen: boolean;
  linkedFile: string;
}

export interface MeetingEditFields {
  title: string;
  date: string;
  time: string;
  monthly: boolean;
  focusBlock: boolean;
  linkedFile: string;
}

/** An agreement's edit, or the form of a Change (`change`: + Add ends the old one and adds this). */
export interface AgreementEditFields {
  text: string;
  valid: string | null;
  change: boolean;
}

export type EditFields =
  | {kind: 'task'; fields: TaskEditFields}
  | {kind: 'meeting'; fields: MeetingEditFields}
  | {kind: 'agreement'; fields: AgreementEditFields};

/** The edit fields of an agreement's Edit or Change (docs/dev/history/technical-design-meetings-0.21.md §5). */
export function loadAgreementEditFields(agreement: Agreement, change: boolean): EditFields {
  return {kind: 'agreement', fields: {text: agreement.text, valid: agreement.fields.valid, change}};
}

/** The edit fields for the item being edited (a todo wins when both are set), or null when nothing is edited. */
export function loadEditFields(editingTask: Task | undefined, editingMeeting: Meeting | undefined): EditFields | null {
  if (editingTask) {
    return {
      kind: 'task',
      fields: {
        text: editingTask.text,
        flowState: editingTask.flowState,
        waitingOnText: editingTask.waitingOn ?? '',
        dueDate: editingTask.dueDate ?? '',
        dueDateOpen: !!editingTask.dueDate,
        linkedFile: editingTask.linkedFile ?? '',
      },
    };
  }
  if (editingMeeting) {
    return {
      kind: 'meeting',
      fields: {
        // `#monthly` and `#focusblock` are edited through the M and F toggles, not as title text;
        // `#prepped`/`#reviewed` on the card (docs/dev/history/technical-design-meeting-reflection.md §2.5).
        title: stripTrackingTags(setFocusBlock(setHighlight(editingMeeting.title, false), false)),
        date: editingMeeting.date,
        time: formatMeetingWhen(editingMeeting),
        monthly: isHighlight(editingMeeting),
        focusBlock: isFocusBlock(editingMeeting),
        linkedFile: editingMeeting.linkedFile ?? '',
      },
    };
  }
  return null;
}

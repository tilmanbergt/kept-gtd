/**
 * The context panel under a tapped meeting's or focus block's card
 * (docs/dev/history/technical-design-time-and-place.md §3.2, D11-D15), the
 * same on Daily, Week, Month and Review's Week ahead: an optional back row,
 * then one paged list - I owe · Next · Planned · Waiting for · Agreed last time / From
 * its meetings / Agreed here - whose section captions are rows, so paging
 * stays exact; sections without rows are left out. The header names the owner
 * (its kind a badge on the right, ui/KindBadge.tsx) and opens its overview (thread, loop) or page (Project, Area); its "✕ Close"
 * closes the meeting like the card's ✕ (§10 C6). The footer switches the
 * card's slot to Quick Add for this meeting and back.
 *
 * Todo rows tick, open their note and linked file through the slot's
 * ui/useEntryActions.ts; a tap on a row selects it - its card shows in Quick
 * Add's place, a second tap its edit form (the slot's own selection,
 * ui/meetingContext/useMeetingContextSlot.ts, §10 C5).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AgreementRef} from '../../domain/agreementOwner';
import {ownerHomePath, OwnerTodoRef} from '../../domain/engageOwner';
import {isFocusBlock} from '../../domain/focusBlock';
import {MeetingContextModel, OWNER_LENS_LINE} from '../../domain/meetingContext';
import {todayIso} from '../../domain/meetingTime';
import AgreementRow, {AGREEMENT_ROW_HEIGHT} from '../AgreementRow';
import KindBadge from '../KindBadge';
import {common} from '../commonStyles';
import {openOverview} from '../overviewStore';
import PagedSection from '../PagedSection';
import TaskRow, {taskRowHeight, taskRowLines} from '../TaskRow';
import {FONT} from '../theme';
import {EntryActions} from '../useEntryActions';
import {panelTodoKey} from './useMeetingContextSlot';
import {Meeting} from '../../domain/types';
import {estimatorWidth} from '../ScreenSize';

type PanelRow =
  | {kind: 'caption'; text: string}
  | {kind: 'info'; text: string}
  | {kind: 'todo'; todo: OwnerTodoRef}
  | {kind: 'agreement'; agreement: AgreementRef};

/** A caption or info row: small line 18 + marginTop 6 + marginBottom 4 (design-device-rendering §5.5). */
const CAPTION_ROW_PX = 28;

export function panelRowsOf(model: MeetingContextModel): PanelRow[] {
  const rows: PanelRow[] = [];
  if (model.mode === 'owner-lens' && model.ownerTitle) rows.push({kind: 'info', text: `${OWNER_LENS_LINE} ${model.ownerTitle.kindLabel.toLowerCase()}`});
  const section = (caption: string, todos: OwnerTodoRef[]) => {
    if (todos.length === 0) return;
    rows.push({kind: 'caption', text: caption});
    todos.forEach(todo => rows.push({kind: 'todo', todo}));
  };
  section('I owe', model.owe);
  section('Next', model.next);
  section('Planned', model.planned);
  section('Waiting for', model.waiting);
  // A todo already listed above shows once.
  const listed = new Set([...model.owe, ...model.next, ...model.planned, ...model.waiting].map(t => `${t.item.path}#${t.taskIndex}`));
  const agreedRows = (model.agreed?.group.rows ?? []).filter(row => row.kind === 'agreement' || !listed.has(`${row.todo.item.path}#${row.todo.taskIndex}`));
  if (model.agreed && agreedRows.length > 0) {
    rows.push({kind: 'caption', text: model.agreed.caption});
    for (const row of agreedRows) rows.push(row.kind === 'todo' ? {kind: 'todo', todo: row.todo} : {kind: 'agreement', agreement: row.agreement});
  }
  return rows;
}

const rowHeight = (row: PanelRow) =>
  row.kind === 'todo' ? taskRowHeight(row.todo.task, estimatorWidth(), 'flat') : row.kind === 'agreement' ? AGREEMENT_ROW_HEIGHT : CAPTION_ROW_PX;

interface Props {
  model: MeetingContextModel;
  meeting: Meeting;
  /** Quick Add is showing for this meeting (the selection's `add` mode). */
  adding: boolean;
  onQuickAdd: () => void;
  onBackToCard: () => void;
  /** Closes the meeting (the screen's cancel): back to Next todos or Given time. */
  onClose: () => void;
  /** The slot's todo actions and selection. */
  actions: EntryActions;
  selectedTodoKey: string | null;
  onSelectTodo: (todo: OwnerTodoRef) => void;
  /** Opens a Project's or Area's page (a plain meeting's owner). */
  onOpenItem: (path: string) => void;
  /** Week/Month: "‹ Back to Week 44 · Tue 27.10. · 8 meetings ›" above the list. */
  backRow?: React.ReactNode;
  textColor: string;
  borderColor: string;
}

export default function MeetingContextPanel(props: Props): React.JSX.Element {
  const {model, meeting, adding, onQuickAdd, onBackToCard, onClose, actions, selectedTodoKey, onSelectTodo, onOpenItem, backRow, textColor, borderColor} = props;
  const today = todayIso();
  const rows = panelRowsOf(model);
  const {owner, ownerTitle} = model;
  const title = ownerTitle ? [ownerTitle.name, ownerTitle.parent].filter(Boolean).join(' · ') : 'Inbox';
  const openOwner = () => {
    if (!owner) return;
    if (owner.kind === 'item') onOpenItem(owner.itemPath);
    else openOverview({tag: owner.tag, ownerPath: ownerHomePath(owner)});
  };

  const renderRow = (row: PanelRow) => {
    if (row.kind === 'caption' || row.kind === 'info') {
      return (
        <Text key={`${row.kind}:${row.text}`} style={[common.subheading, styles.caption, row.kind === 'info' && styles.info, {color: textColor}]} numberOfLines={1}>
          {row.text}
        </Text>
      );
    }
    if (row.kind === 'agreement') {
      return <AgreementRow key={`agreement:${row.agreement.itemPath}#${row.agreement.index}`} agreement={row.agreement} today={today} textColor={textColor} borderColor={borderColor} />;
    }
    const {todo} = row;
    return (
      <TaskRow
        key={`todo:${todo.item.path}#${todo.taskIndex}`}
        task={todo.task}
        isEditing={selectedTodoKey === panelTodoKey(todo)}
        onStartEdit={() => onSelectTodo(todo)}
        onToggleDone={() => actions.toggleDone(todo)}
        onCreateNote={() => actions.taskNote(todo)}
        onOpenNote={() => actions.taskNote(todo)}
        linkedFile={todo.task.linkedFile}
        onOpenLinkedFile={actions.openFile}
        ownerPath={todo.item.path}
        context="flat"
        height={rowHeight(row)}
        numberOfLines={taskRowLines(todo.task, estimatorWidth(), 'flat')}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  };

  return (
    <View style={styles.root}>
      {backRow}
      <PagedSection
        header={title}
        headerAccessory={
          <View style={styles.accessory}>
            {ownerTitle ? <KindBadge label={ownerTitle.kindLabel} textColor={textColor} /> : null}
            {owner ? (
              <Pressable onPress={openOwner} hitSlop={8} style={styles.overview}>
                <Text style={[styles.link, {color: textColor}]}>Overview ›</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityLabel="Close the meeting">
              <Text style={[styles.link, {color: textColor}]}>✕ Close</Text>
            </Pressable>
          </View>
        }
        rows={rows}
        rowHeight={rowHeight}
        resetKey={`${title}|${meeting.date}|${meeting.title}`}
        heightKey="meetingContext"
        isCountableRow={row => row.kind === 'todo' || row.kind === 'agreement'}
        renderRow={renderRow}
        emptyHint="Nothing open for this meeting yet."
        textColor={textColor}
        borderColor={borderColor}
      />
      <Pressable onPress={adding ? onBackToCard : onQuickAdd} hitSlop={8} style={[styles.footer, {borderColor}]}>
        <Text style={[styles.footerText, {color: textColor}]}>
          {adding ? '‹ Back to the card' : isFocusBlock(meeting) ? '+ Quick Add to block' : '+ Quick Add to meeting'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  caption: {marginTop: 6, marginBottom: 4},
  info: {fontWeight: '400', fontStyle: 'italic'},
  accessory: {flexDirection: 'row', alignItems: 'center'},
  overview: {marginLeft: 16},
  close: {marginLeft: 16},
  link: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
  footer: {borderTopWidth: 1, paddingVertical: 8, alignItems: 'flex-start'},
  footerText: {fontSize: FONT.medium, fontWeight: '600'},
});

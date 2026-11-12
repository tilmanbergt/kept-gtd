/**
 * Quick Add's form (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.1-§3.4): for each kind its two-line field with its strips, its row 3 and
 * its row 4, all mounted, the inactive kinds hidden with `display: 'none'`
 * (drafts survive, no TextInput is created again). ui/QuickAddWidget.tsx puts
 * the three slots into QuickAddFrame's `form` layout.
 */
import React, {useCallback, useRef} from 'react';
import {LayoutChangeEvent} from 'react-native';
import {formatDayMonthShort, formatTimeSpan, formatWeekdayShort} from '../../../domain/dateFormat';
import {StripContent} from '../../../domain/writing/stripContent';
import {SuggestInput, suggestOptions} from '../../../domain/writing/suggestOptions';
import {VALID_PRESETS} from '../../../domain/agreementText';
import {validTillOf} from '../../../domain/agreements';
import {nextUsualDate, UsualSlot} from '../../../domain/writing/meetingHints';
import {todayIso} from '../../../domain/meetingTime';
import {useLayoutClass} from '../../ScreenSize';
import WritingStrip from '../../writing/WritingStrip';
import {ClipboardActions} from '../../ClipboardStrip';
import {WritingStripActions} from '../../writing/useWritingHelp';
import {QuickAddType} from '../types';
import {QuickAddCore} from '../useQuickAddCore';
import {TaskDraftState} from '../useTaskDraft';
import {MeetingDraftState} from '../useMeetingDraft';
import {NoteDraftState} from '../useNoteDraft';
import {AgreementDraftState} from '../useAgreementDraft';
import FormField from './FormField';
import FormFooter from './FormFooter';
import Row3Agreement from './Row3Agreement';
import Row3Meeting from './Row3Meeting';
import Row3Note from './Row3Note';
import Row3Todo from './Row3Todo';
import {stripVisibility, WhenFocus} from './StripHost';
import WhenStrip from './WhenStrip';
import ValidStrip from './ValidStrip';

interface Colors {
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

/** What the Suggest view knows beyond the text (the widget fills it). */
export interface SuggestContext {
  thisFile: boolean;
  recentTags: readonly string[];
  abbrevs: ReadonlyArray<{tag: string; name: string}>;
}

/** The abbreviations of places used lately (their tags among the recent ones first), at most four, for the Suggest view. */
export function recentAbbrevs(
  items: ReadonlyArray<{abbrev: string | null; name: string; status: string}>,
  recentTags: readonly string[],
): Array<{tag: string; name: string}> {
  const active = items.filter(i => i.abbrev && (i.status === 'active' || i.status === 'on-hold'));
  const recent = recentTags.map(t => t.replace(/^#/, '').toLowerCase());
  const rank = (abbrev: string) => {
    const at = recent.indexOf(abbrev.toLowerCase());
    return at < 0 ? Number.MAX_SAFE_INTEGER : at;
  };
  return active
    .filter(i => rank(i.abbrev!) !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => rank(a.abbrev!) - rank(b.abbrev!))
    .slice(0, 4)
    .map(i => ({tag: i.abbrev!, name: i.name}));
}

/** The box's inner width before the first layout: the A5 X's two-column box. */
const DEFAULT_WIDTH_DP = 640;

/** The Suggest options of `kind` for `text`, fitted to the box's width as last measured. */
export function makeSuggest(kind: SuggestInput['kind'], context: SuggestContext, width: () => number) {
  return (text: string) =>
    suggestOptions({text, kind, thisFile: context.thisFile && kind !== 'agreement' && kind !== 'note', recentTags: context.recentTags, abbrevs: context.abbrevs}, width());
}

/** The last measured width of the form's field, for the session. */
let lastFormWidth = DEFAULT_WIDTH_DP;

/**
 * The box's measured inner width, for the Suggest view. Kept in a ref, not state: a new
 * width needs no render of its own - the strip shows on focus, which renders anyway.
 */
export function useFormWidth(): [() => number, (e: LayoutChangeEvent) => void] {
  const width = useRef(lastFormWidth);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w <= 0) return;
    width.current = w;
    lastFormWidth = w;
  }, []);
  const get = useCallback(() => width.current, []);
  return [get, onLayout];
}

/** `usual Thu 15:00 – 16:30`. */
function usualTimeLabel(slot: UsualSlot): string {
  return `usual ${formatWeekdayShort(slot.date)} ${formatTimeSpan(slot.time, slot.endTime)}`;
}

/** `usual Thu → 20 Nov`. */
function usualDateLabel(slot: UsualSlot): string {
  return `usual ${formatWeekdayShort(slot.date)} → ${formatDayMonthShort(nextUsualDate(slot, todayIso()))}`;
}

interface TextStripProps extends Colors {
  visible: boolean;
  content: StripContent;
  actions: WritingStripActions;
  clipboard?: ClipboardActions;
}

function TextStrip({visible, content, actions, clipboard, textColor, borderColor}: TextStripProps): React.JSX.Element {
  return (
    <WritingStrip
      visible={visible}
      content={content}
      actions={actions}
      clipboard={clipboard}
      placement="above-box"
      switchable
      textColor={textColor}
      borderColor={borderColor}
    />
  );
}

export interface FormInput extends Colors {
  core: QuickAddCore;
  task: TaskDraftState;
  meeting: MeetingDraftState;
  note: NoteDraftState;
  agreement: AgreementDraftState;
  needs: (type: QuickAddType) => boolean;
  /** Nobody sees the rows (collapsed box, a card): they keep their last picture. */
  rowsHidden: boolean;
  /** The main button (+ Add … / Cancel · Save). */
  main: React.ReactNode;
  /** ✕ of a create form in a collapsible box. */
  onCollapse?: () => void;
  /** The grey origin line (or a loop's own commands) per kind. */
  origin: {task?: React.ReactNode; meeting?: React.ReactNode; agreement?: React.ReactNode};
  /** The clip slot's file while creating (📎 This file), with its ✕. */
  createFile: {linkedFile: string | null; onClear: () => void};
  linkedFileMissing?: boolean;
  noteFolder: string | null;
  today: string;
  placeholder?: string;
  onFieldLayout: (e: LayoutChangeEvent) => void;
}

export function useFormSlots(input: FormInput): {field: React.ReactNode; row3: React.ReactNode; row4: React.ReactNode} {
  const {core, task, meeting, note, agreement, needs, rowsHidden, main, onCollapse, origin, createFile, linkedFileMissing, noteFolder, today} = input;
  const colors = {textColor: input.textColor, borderColor: input.borderColor, placeholderColor: input.placeholderColor};
  const {textColor, borderColor} = colors;
  const narrow = useLayoutClass() === 'narrow';
  const kind = core.displayType;
  const isTask = kind === 'task';
  const isMeeting = kind === 'meeting';
  const isNote = kind === 'note';
  const isAgreement = kind === 'agreement';

  const taskWhen: WhenFocus = task.dueFocused ? 'date' : null;
  const meetingWhen: WhenFocus = meeting.dateFocused ? 'date' : meeting.timeFocused ? 'time' : null;
  const agreementWhen: WhenFocus = agreement.validOpen ? 'valid' : null;
  const taskVis = stripVisibility(task.inputFocused, taskWhen, false);
  const meetingVis = stripVisibility(meeting.inputFocused, meetingWhen, false);
  const noteVis = stripVisibility(note.titleField.focused, null, false);
  const agreementVis = stripVisibility(agreement.textField.focused, agreementWhen, false);
  const visibleWhile = (shown: boolean, on: boolean) => shown && on && !rowsHidden;

  const usual = meeting.hints.usual;
  const field = (
    <>
      {needs('task') && (
        <FormField
          inputRef={task.inputRef}
          value={task.fields.text}
          onChangeText={task.setText}
          onSelectionChange={task.onSelectionChange}
          selection={task.selectionOverride}
          onFocus={() => {
            task.setInputFocused(true);
            task.textHelp.onFocus();
          }}
          onBlur={() => task.setInputFocused(false)}
          placeholder={input.placeholder ?? 'New todo'}
          mark={core.fieldMark('text')}
          hidden={!isTask}
          onLayout={input.onFieldLayout}
          strips={
            <>
              <TextStrip visible={visibleWhile(isTask, taskVis.text)} content={task.textHelp.strip} actions={task.textHelp.actions} clipboard={task.clipboard} {...colors} />
              <WhenStrip
                visible={visibleWhile(isTask, taskVis.date)}
                field="date"
                value={task.fields.dueDate}
                content={task.dueHelp.strip}
                actions={task.dueHelp.actions}
                warning={null}
                suggestLabel={null}
                onChange={task.writeDueDate}
                narrow={narrow}
                {...colors}
              />
            </>
          }
          {...colors}
        />
      )}
      {needs('meeting') && (
        <FormField
          inputRef={meeting.inputRef}
          value={meeting.fields.title}
          onChangeText={meeting.setTitle}
          onSelectionChange={meeting.onSelectionChange}
          selection={meeting.selectionOverride}
          onFocus={() => {
            meeting.setInputFocused(true);
            meeting.titleHelp.onFocus();
          }}
          onBlur={() => meeting.setInputFocused(false)}
          placeholder="New meeting"
          mark={core.fieldMark('title')}
          hidden={!isMeeting}
          onLayout={input.onFieldLayout}
          strips={
            <>
              <TextStrip
                visible={visibleWhile(isMeeting, meetingVis.text)}
                content={meeting.titleHelp.strip}
                actions={meeting.titleHelp.actions}
                clipboard={meeting.clipboard}
                {...colors}
              />
              <WhenStrip
                visible={visibleWhile(isMeeting, meetingVis.date)}
                field="date"
                value={meeting.fields.date}
                content={meeting.dateHelp.strip}
                actions={meeting.dateHelp.actions}
                warning={meeting.hints.dateShort}
                suggestLabel={usual ? usualDateLabel(usual) : null}
                onSuggest={usual ? () => meeting.applyUsualDate(usual) : undefined}
                onChange={meeting.writeDate}
                narrow={narrow}
                {...colors}
              />
              <WhenStrip
                visible={visibleWhile(isMeeting, meetingVis.time)}
                field="time"
                value={meeting.fields.time}
                content={meeting.timeHelp.strip}
                actions={meeting.timeHelp.actions}
                warning={meeting.hints.timeShort}
                suggestLabel={usual ? usualTimeLabel(usual) : null}
                onSuggest={usual ? () => meeting.applyUsual(usual) : undefined}
                onChange={meeting.writeTime}
                narrow={narrow}
                {...colors}
              />
            </>
          }
          {...colors}
        />
      )}
      {needs('note') && (
        <FormField
          inputRef={note.titleField.inputRef}
          value={note.draft.titleRaw}
          onChangeText={note.setTitleRaw}
          onSelectionChange={note.titleField.onSelectionChange}
          selection={note.titleField.selectionOverride}
          onFocus={() => note.titleField.onFocusChange(true)}
          onBlur={() => note.titleField.onFocusChange(false)}
          placeholder="New note"
          mark={null}
          editable={!core.pending}
          hidden={!isNote}
          onLayout={input.onFieldLayout}
          strips={
            <TextStrip
              visible={visibleWhile(isNote, noteVis.text)}
              content={note.titleField.help.strip}
              actions={note.titleField.help.actions}
              clipboard={note.titleField.clipboard}
              {...colors}
            />
          }
          {...colors}
        />
      )}
      {needs('agreement') && (
        <FormField
          inputRef={agreement.textField.inputRef}
          value={agreement.fields.text}
          onChangeText={agreement.setText}
          onSelectionChange={agreement.textField.onSelectionChange}
          selection={agreement.textField.selectionOverride}
          onFocus={() => agreement.textField.onFocusChange(true)}
          onBlur={() => agreement.textField.onFocusChange(false)}
          placeholder="New agreement"
          mark={core.fieldMark('text')}
          editable={!core.pending}
          hidden={!isAgreement}
          onLayout={input.onFieldLayout}
          strips={
            <>
              <TextStrip
                visible={visibleWhile(isAgreement, agreementVis.text)}
                content={agreement.textField.help.strip}
                actions={agreement.textField.help.actions}
                clipboard={agreement.textField.clipboard}
                {...colors}
              />
              <ValidStrip
                visible={visibleWhile(isAgreement, agreementVis.valid)}
                presets={VALID_PRESETS.map(p => ({label: p.label, value: validTillOf(p.preset, today)}))}
                onPick={valid => {
                  agreement.setValid(valid);
                  agreement.setValidOpen(false);
                }}
                onType={() => {
                  agreement.setValidOpen(false);
                  agreement.setValidTyping(true);
                }}
                onClose={() => agreement.setValidOpen(false)}
                textColor={textColor}
                borderColor={borderColor}
              />
            </>
          }
          {...colors}
        />
      )}
    </>
  );

  const row3 = (
    <>
      {needs('task') && <Row3Todo task={task} hidden={!isTask} {...colors} />}
      {needs('meeting') && <Row3Meeting core={core} meeting={meeting} hidden={!isMeeting} {...colors} />}
      {needs('note') && <Row3Note folder={noteFolder} hidden={!isNote} textColor={textColor} />}
      {needs('agreement') && <Row3Agreement agreement={agreement} today={today} hidden={!isAgreement} {...colors} />}
    </>
  );

  const editing = core.isEditing;
  const clip = (linkedFile: string | null, onClearEdit: () => void) =>
    editing ? {linkedFile: linkedFile || null, missing: linkedFileMissing, onClear: onClearEdit} : {linkedFile: createFile.linkedFile, onClear: createFile.onClear};
  const collapse = editing ? undefined : onCollapse;
  const row4 = isTask ? (
    <FormFooter clip={clip(task.linkedFile, task.clearLinkedFile)} origin={origin.task} onCollapse={collapse} main={main} {...colors} />
  ) : isMeeting ? (
    <FormFooter clip={clip(meeting.linkedFile, meeting.clearLinkedFile)} origin={origin.meeting} onCollapse={collapse} main={main} {...colors} />
  ) : (
    <FormFooter clip={null} origin={isAgreement ? origin.agreement : undefined} onCollapse={collapse} main={main} {...colors} />
  );
  return {field, row3, row4};
}

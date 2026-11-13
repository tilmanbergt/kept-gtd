/**
 * The lasso capture panel's Todo rows (ui/quickAdd/CaptureQuickAdd.tsx): R2,
 * the multi-line text (or the Split lines rows in its place), the due-date
 * control, and R3, the flow chips or the "Waiting on" field. Quick Add's box
 * has its own form (ui/quickAdd/form/). The rows stay mounted while another
 * kind shows (`hidden`), so the TextInputs are created once - see
 * ui/quickAdd/styles.ts.
 */
import React from 'react';
import {usePerfRender} from '../../utils/perf';
import WritingStrip from '../writing/WritingStrip';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import DateInput from '../DateInput';
import FlowStateChips from '../FlowStateChips';
import MarkWrap from '../status/StatusMark';
import {FONT} from '../theme';
import {rowStyles} from './styles';
import {QuickAddCore} from './useQuickAddCore';
import {TaskDraftState} from './useTaskDraft';

interface Colors {
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

/** The due date: a 📅 button that unfolds into an inline date field with its own strip (never folds back). */
export function TaskDueControl({task, textColor, borderColor, placeholderColor}: {task: TaskDraftState} & Colors) {
  const {fields, loopMode} = task;
  if (!fields.dueDateOpen) {
    return (
      <Pressable style={[styles.iconButton, {borderColor}]} onPress={task.openDueDate} hitSlop={8}>
        <Text style={[styles.iconButtonText, {color: textColor}]}>📅</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.dateInline}>
      <DateInput
        ref={task.dueInputRef}
        value={fields.dueDate}
        onChangeText={task.setDueDate}
        placeholder={loopMode.kind === 'none' || loopMode.kind === 'exists' ? 'Due YYYY-MM-DD' : 'Main date YYYY-MM-DD'}
        placeholderColor={placeholderColor}
        textColor={textColor}
        borderColor={borderColor}
      />
      {fields.dueDate.length > 0 && (
        <Pressable onPress={() => task.writeDueDate('')} hitSlop={8}>
          <Text style={[rowStyles.clearX, {color: textColor}]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

interface InputRowProps extends Colors {
  core: QuickAddCore;
  task: TaskDraftState;
  placeholder: string;
  /** The Split lines rows, in place of the field while set. */
  splitBlock: React.ReactNode | null;
}

/** R2: the multi-line text (recognized text can be several lines), its writing strip above-right. */
export function TaskInputRow({core, task, placeholder, splitBlock, ...colors}: InputRowProps) {
  usePerfRender('QuickAddRows:task');
  const {textColor, borderColor, placeholderColor} = colors;
  return (
    <View style={[rowStyles.row2, rowStyles.row2Free, core.displayType !== 'task' && rowStyles.hidden]}>
      {splitBlock}
      <View style={[rowStyles.row2Wrap, !!splitBlock && rowStyles.hidden]}>
        <MarkWrap mark={core.fieldMark('text')} textColor={textColor} flex>
          <TextInput
            ref={task.inputRef}
            style={[rowStyles.input, rowStyles.inputFlex, styles.inputMultiline, {color: textColor, borderColor}]}
            multiline
            textAlignVertical="top"
            value={task.fields.text}
            onChangeText={task.setText}
            onSubmitEditing={task.editing ? task.submitEdit : task.submitCreate}
            onSelectionChange={e => task.onSelectionChange(e.nativeEvent.selection)}
            selection={task.selectionOverride ?? undefined}
            onFocus={() => {
              task.setInputFocused(true);
              task.textHelp.onFocus();
            }}
            onBlur={() => task.setInputFocused(false)}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
          />
        </MarkWrap>
      </View>
      <WritingStrip
        visible={task.inputFocused}
        content={task.textHelp.strip}
        actions={task.textHelp.actions}
        clipboard={task.clipboard}
        placement="above-right"
        textColor={textColor}
        borderColor={borderColor}
      />
    </View>
  );
}

/** R3: the flow chips, or with w/f the "Waiting on" field; free height. */
export function TaskMetaRows({core, task, ...colors}: {core: QuickAddCore; task: TaskDraftState} & Colors) {
  const {textColor, borderColor, placeholderColor} = colors;
  const hidden = core.displayType !== 'task' && rowStyles.hidden;
  const row3Style = [rowStyles.row3, rowStyles.row3Free, hidden];
  if (task.fields.flowState === 'waiting-for') {
    return (
      <View style={row3Style}>
        <Pressable style={[rowStyles.chip, rowStyles.chipSelected]} onPress={() => task.setFlowState(null)} hitSlop={8}>
          <Text style={rowStyles.chipTextSelected}>w/f</Text>
        </Pressable>
        <TextInput
          style={[rowStyles.input, styles.waitingInput, {color: textColor, borderColor}]}
          value={task.fields.waitingOnText}
          onChangeText={task.setWaitingOn}
          placeholder="Waiting on (who/what)"
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
        />
      </View>
    );
  }
  return (
    <View style={row3Style}>
      <View style={rowStyles.row3ChipsGroup}>
        <FlowStateChips value={task.fields.flowState} onChange={task.setFlowState} compact={false} textColor={textColor} borderColor={borderColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Recognized text can be several lines (3 visible, up to ~6). */
  inputMultiline: {
    minHeight: 96,
    maxHeight: 170,
  },
  waitingInput: {
    flex: 1,
    marginRight: 6,
  },
  dateInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: FONT.medium,
  },
});

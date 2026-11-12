/**
 * Row 3 of the todo form (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.3): 📅 on the left - a tap opens the due-date field in its place, with the
 * cursor in it, and it stays once open - and w/f on the right: on, "Waiting on"
 * opens left of it; off, the field goes and its name is cleared. The flow state
 * is otherwise not touched by the form; `#next` and `#someday` are written in
 * the text (the strip offers them).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import DateInput from '../../DateInput';
import MarkWrap from '../../status/StatusMark';
import {COLORS, FONT} from '../../theme';
import {rowStyles} from '../styles';
import {TaskDraftState} from '../useTaskDraft';

interface Props {
  task: TaskDraftState;
  hidden: boolean;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function Row3Todo({task, hidden, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  const {fields} = task;
  const waiting = fields.flowState === 'waiting-for';
  return (
    <View style={[rowStyles.row3, hidden && rowStyles.hidden]}>
      {fields.dueDateOpen ? (
        <MarkWrap mark={null} textColor={textColor}>
          <DateInput
            ref={task.dueInputRef}
            onFocusChange={focused => {
              task.setDueFocused(focused);
              if (focused) task.dueHelp.onFocus();
            }}
            value={fields.dueDate}
            onChangeText={task.setDueDate}
            placeholder="Due YYYY-MM-DD"
            placeholderColor={placeholderColor}
            textColor={textColor}
            borderColor={borderColor}
          />
        </MarkWrap>
      ) : (
        <Pressable style={[styles.square, {borderColor}]} onPress={task.openDueDate} hitSlop={8} accessibilityRole="button" accessibilityLabel="Due date">
          <Text style={[styles.squareText, {color: textColor}]}>📅</Text>
        </Pressable>
      )}
      <View style={styles.spacer} />
      {waiting ? (
        <TextInput
          ref={task.waitingInputRef}
          style={[rowStyles.input, styles.waitingInput, {color: textColor, borderColor}]}
          value={fields.waitingOnText}
          onChangeText={task.setWaitingOn}
          placeholder="Waiting on"
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
        />
      ) : null}
      <Pressable
        style={[styles.wf, {borderColor: COLORS.accent}, waiting && styles.wfOn]}
        onPress={task.toggleWaiting}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="w/f"
        accessibilityState={{selected: waiting}}>
        <Text style={[styles.wfText, {color: waiting ? COLORS.accentText : textColor}]}>w/f</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  square: {width: 32, height: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  squareText: {fontSize: FONT.medium},
  spacer: {flex: 1},
  waitingInput: {width: 170, marginRight: 6, paddingVertical: 4, fontSize: FONT.small},
  wf: {height: 32, borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, justifyContent: 'center', flexShrink: 0},
  wfOn: {backgroundColor: COLORS.accent},
  wfText: {fontSize: FONT.small, fontWeight: '600'},
});

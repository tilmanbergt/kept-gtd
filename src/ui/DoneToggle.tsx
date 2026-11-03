/**
 * "show 2 done" / "hide done" in a todo list's header line (the Current page's Todos, the Inbox's
 * Tasks), right of the heading and before the page arrows - not a line of its own above the list
 * (docs/dev/history/technical-design-launch-ready.md L6c). Nothing while there are no done todos.
 */
import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {FONT} from './theme';

interface Props {
  doneCount: number;
  hideDone: boolean;
  onToggle: () => void;
  textColor: string;
}

export function doneToggleLabel(doneCount: number, hideDone: boolean): string {
  return hideDone ? `show ${doneCount} done` : 'hide done';
}

export default function DoneToggle({doneCount, hideDone, onToggle, textColor}: Props): React.JSX.Element | null {
  if (doneCount === 0) return null;
  return (
    <Pressable onPress={onToggle} hitSlop={8} style={styles.button}>
      <Text style={[styles.text, {color: textColor}]}>{doneToggleLabel(doneCount, hideDone)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {marginLeft: 8, marginRight: 4},
  text: {fontSize: FONT.small, opacity: 0.6, textDecorationLine: 'underline'},
});

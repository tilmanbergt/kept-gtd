/**
 * "n marks to process" (docs/dev/history/technical-design-lasso-0.8.md §3.10): one
 * fixed-height line under Quick Add on the Inbox, Current and Review's Inbox
 * to zero, shown only while there are open marks. One line since 0.24.0 - the
 * "notes · oldest" line went to give the pages room (technical-design-launch-ready.md L6c). "Process ›" opens the
 * marks screen for the same scope; Close there comes back here.
 */
import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {MarkScope} from '../domain/marks';
import {openMarks, MarksReturnTo} from './marksNav';
import {FONT} from './theme';
import {useOpenMarks} from './useOpenMarks';
import {usePerfRender} from '../utils/perf';

export const MARKS_CARD_H = 40;

interface Props {
  scope: MarkScope;
  returnTo: MarksReturnTo;
  textColor: string;
  borderColor: string;
}

export default function MarksCard({scope, returnTo, textColor, borderColor}: Props): React.JSX.Element | null {
  usePerfRender('MarksCard');
  const marks = useOpenMarks(scope);
  if (marks.length === 0) {return null;}
  return (
    <Pressable
      onPress={() => openMarks(scope, returnTo)}
      hitSlop={4}
      accessibilityRole="button"
      style={[styles.card, {borderColor}]}>
      <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
        {marks.length} mark{marks.length === 1 ? '' : 's'} to process
      </Text>
      <Text style={[styles.action, {color: textColor}]}>Process ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: MARKS_CARD_H,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {flex: 1, fontSize: FONT.medium, fontWeight: '700'},
  action: {fontSize: FONT.medium, fontWeight: '700', marginLeft: 12},
});

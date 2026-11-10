/**
 * Quick Add's R1 while the box is collapsed
 * (docs/dev/history/technical-design-calmer-screens.md §3.2): one button per
 * kind the screen offers - `+ Todo · + Meeting` and, as on TabsRow, Agreement
 * only where the screen passes `onAddAgreement` and Note only where it passes
 * `onAddNote`. A tap opens that kind in the same box with the cursor in its
 * field. A kind TabsRow greys out (Meeting while `taskOnly`, Note without a
 * folder) is greyed here too. Below 800 dp Agreement is called "Agree".
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useLayoutClass} from '../ScreenSize';
import {FONT, RADII} from '../theme';
import {QUICK_ADD_ROWS} from './QuickAddFrame';
import {QuickAddType} from './types';

interface Props {
  hasAgreement: boolean;
  hasNote: boolean;
  taskOnly: boolean;
  noteFolderPath: string | null;
  onOpen: (type: QuickAddType) => void;
  textColor: string;
  borderColor: string;
}

/** The button labels, also used by the help pages and scenarios. */
export const KIND_BUTTON_LABEL: Record<QuickAddType, string> = {task: '+ Todo', meeting: '+ Meeting', agreement: '+ Agreement', note: '+ Note'};

export default function KindButtons({hasAgreement, hasNote, taskOnly, noteFolderPath, onOpen, textColor, borderColor}: Props): React.JSX.Element {
  const narrow = useLayoutClass() === 'narrow';
  const button = (type: QuickAddType, disabled = false) => (
    <Pressable
      key={type}
      onPress={() => onOpen(type)}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      style={[styles.pill, {borderColor}, disabled && styles.disabled]}>
      <Text style={[styles.text, {color: textColor}]} numberOfLines={1}>
        {type === 'agreement' && narrow ? '+ Agree' : KIND_BUTTON_LABEL[type]}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.row} testID="quick-add-kinds">
      {button('task')}
      {button('meeting', taskOnly)}
      {hasAgreement && button('agreement')}
      {hasNote && button('note', !noteFolderPath)}
    </View>
  );
}

/** The pill's height: it fits R1 (QUICK_ADD_ROWS.tabs) with room for its border, so nothing is cut. */
export const KIND_BUTTON_HEIGHT = QUICK_ADD_ROWS.tabs - 4;

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden'},
  // The look of ui/PillButton.tsx at R1's height: the text without font padding, centred.
  pill: {
    height: KIND_BUTTON_HEIGHT,
    borderWidth: 1,
    borderRadius: RADII.pillMd,
    paddingHorizontal: 10,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {fontSize: FONT.small, fontWeight: '600', includeFontPadding: false},
  disabled: {opacity: 0.35},
});

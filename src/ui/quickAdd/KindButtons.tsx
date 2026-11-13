/**
 * Quick Add's R1 while the box is collapsed
 * (docs/dev/history/technical-design-calmer-screens.md §3.2): one button per
 * kind the screen offers - `+ Todo · + Meeting` and, as on TabsRow, Agreement
 * only where the screen passes `onAddAgreement` and Note only where it passes
 * `onAddNote`. A tap opens that kind in the same box with the cursor in its
 * field. A kind TabsRow greys out (Meeting while `taskOnly`, Note without a
 * folder) is greyed here too. Below 800 dp Agreement is called "Agree".
 *
 * Large and inviting: the buttons are half again as high as R1 and wrap onto a
 * second row where the width ends (Nomad portrait); the collapsed box has no
 * other rows, so two rows of buttons fit its fixed height (QuickAddFrame).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useLayoutClass} from '../ScreenSize';
import {FONT, RADII} from '../theme';
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

/** A button's height, and the gap below and beside it: two rows fit the collapsed box (QUICK_ADD_HEIGHT). */
export const KIND_BUTTON_HEIGHT = 40;
export const KIND_BUTTON_GAP = 10;

const styles = StyleSheet.create({
  row: {flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start'},
  // The look of ui/PillButton.tsx at R1's height: the text without font padding, centred.
  pill: {
    height: KIND_BUTTON_HEIGHT,
    borderWidth: 1,
    borderRadius: RADII.pillMd,
    paddingHorizontal: 18,
    marginRight: KIND_BUTTON_GAP,
    marginBottom: KIND_BUTTON_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {fontSize: FONT.medium, fontWeight: '700', includeFontPadding: false},
  disabled: {opacity: 0.35},
});

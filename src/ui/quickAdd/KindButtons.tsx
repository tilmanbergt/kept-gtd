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
import {StyleSheet, View} from 'react-native';
import PillButton from '../PillButton';
import {useLayoutClass} from '../ScreenSize';
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
    <PillButton
      key={type}
      label={type === 'agreement' && narrow ? '+ Agree' : KIND_BUTTON_LABEL[type]}
      onPress={() => onOpen(type)}
      disabled={disabled}
      textColor={textColor}
      borderColor={borderColor}
    />
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

const styles = StyleSheet.create({
  // PillButton's own bottom margin would push the pills up in R1's fixed height.
  row: {flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden', marginBottom: -6},
});

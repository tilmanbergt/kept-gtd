/**
 * The owner card of Week's and Month's Given time
 * (docs/dev/history/technical-design-calmer-screens.md §3.9, O4): after one
 * tap on an owner's line, in Quick Add's box, at the box's row heights.
 *   R1 the name and its kind, ✕
 *   R2 the time given in the period
 *   R3 the grey line the one-line row leaves out ("1 block · 2 meetings · 3 done
 *      · next: Fix the leaking tap", domain/givenTime.ts givenTimeDetail)
 *   R4 Open › - the Project's or Area's page, or the thread's or loop's overview.
 */
import React from 'react';
import {Text, View} from 'react-native';
import {GivenTimeRow, givenTimeDetail, givenTimeText} from '../../domain/givenTime';
import {cardStyles, CardRow1, DetailLine, TextButton} from './parts';
import {useCardCommitTrace} from './useCardCommitTrace';

interface Props {
  row: GivenTimeRow;
  onOpen: () => void;
  onClose: () => void;
  textColor: string;
  borderColor: string;
}

export default function OwnerTimeCard({row, onOpen, onClose, textColor, borderColor}: Props): React.JSX.Element {
  useCardCommitTrace('owner');
  const colors = {textColor, borderColor};
  return (
    <View>
      <CardRow1 heading={`${row.name} · ${row.kindLabel}`} onClose={onClose} {...colors} />
      <View style={[cardStyles.row, cardStyles.row2]}>
        <Text style={[cardStyles.title, {color: textColor}]} numberOfLines={1}>
          {givenTimeText(row)}
        </Text>
      </View>
      <View style={[cardStyles.row, cardStyles.row3]}>
        <DetailLine text={givenTimeDetail(row)} {...colors} />
      </View>
      <View style={[cardStyles.row, cardStyles.row4]}>
        <TextButton label="Open" text="Open ›" onPress={onOpen} {...colors} />
      </View>
    </View>
  );
}

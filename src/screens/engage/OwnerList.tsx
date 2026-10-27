/**
 * S9 (docs/dev/history/technical-design-engage.md §3.7, D28): the owners of
 * today's remaining meetings and focus blocks as lines "Kind · Name · n next ›"
 * in time order (domain/engageOptions.ts's scheduleOwnerLines); a tap makes
 * that owner the panel's owner.
 */
import React from 'react';
import {Pressable, Text} from 'react-native';
import {ownerKey} from '../../domain/engageOwner';
import {OwnerLine} from '../../domain/engageOptions';
import {ENGAGE_TEXT, ownerLineText} from '../../domain/engageText';
import PagedSection from '../../ui/PagedSection';
import {ENGAGE_LIST_VIEWPORT, ENGAGE_ROW_H, engageStyles as styles} from './engageStyles';

interface Props {
  lines: OwnerLine[];
  onChoose: (line: OwnerLine) => void;
  textColor: string;
  borderColor: string;
}

export default function OwnerList({lines, onChoose, textColor, borderColor}: Props): React.JSX.Element {
  return (
    <PagedSection
        header={ENGAGE_TEXT.schedule}
        rows={lines}
        rowHeight={() => ENGAGE_ROW_H}
        viewportHeight={ENGAGE_LIST_VIEWPORT}
        emptyHint={ENGAGE_TEXT.noSchedule}
        textColor={textColor}
        borderColor={borderColor}
        renderRow={line => (
          <Pressable key={ownerKey(line.owner)} onPress={() => onChoose(line)} style={[styles.row, {borderBottomColor: borderColor}]}>
            <Text style={[styles.rowText, {color: textColor}]} numberOfLines={2}>
              {ownerLineText(line)}
            </Text>
          </Pressable>
        )}
      />
  );
}

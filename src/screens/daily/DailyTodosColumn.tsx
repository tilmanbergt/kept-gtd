/**
 * Daily's right column (docs/dev/history/technical-design-daily-slim.md §3.1):
 * Quick Add (or the selected item's card in its place) above the Next todos,
 * grouped by owner, and the line naming items that couldn't be read. The list
 * measures its own height; its height is remembered under `daily:todos`, so a
 * remount starts with the right page.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {DailyItemRef} from '../../storage/dailyAggregate';
import {common} from '../../ui/commonStyles';
import PagedSection from '../../ui/PagedSection';
import {taskRowHeight} from '../../ui/TaskRow';
import {FlatTaskRow, GROUP_HEADER_ROW_PX} from './dailyRows';
import {estimatorWidth} from '../../ui/ScreenSize';

interface Props {
  /** Quick Add or the selected item's card. */
  quickAdd: React.ReactNode;
  /** A selected meeting's context panel, in the Next todos' place (docs/dev/history/technical-design-time-and-place.md §3.2). */
  panel?: React.ReactNode;
  rows: FlatTaskRow[];
  renderEntry: (row: Extract<FlatTaskRow, {kind: 'entry'}>, heightPx: number) => React.ReactNode;
  onOpenItem: (item: DailyItemRef) => void;
  failedItemNames: string[];
  /** The hidden line (ui/context/HiddenLine.tsx) under the list. */
  footer?: React.ReactNode;
  textColor: string;
  borderColor: string;
}

export default function DailyTodosColumn({quickAdd, panel, rows, renderEntry, onOpenItem, failedItemNames, footer, textColor, borderColor}: Props): React.JSX.Element {
  const rowHeight = (row: FlatTaskRow) => (row.kind === 'header' ? GROUP_HEADER_ROW_PX : taskRowHeight(row.entry.task, estimatorWidth(), 'flat'));
  const renderRow = (row: FlatTaskRow) => {
    if (row.kind === 'header') {
      // Natural height: clipping it to GROUP_HEADER_ROW_PX would cut the text; the list measures its real viewport.
      return (
        <Pressable key={`header-${row.item.path}`} onPress={() => onOpenItem(row.item)} hitSlop={8}>
          <Text style={[common.subheading, styles.groupHeading, {color: textColor}]} numberOfLines={1}>
            {row.item.name}
          </Text>
        </Pressable>
      );
    }
    return renderEntry(row, rowHeight(row));
  };
  return (
    <View style={styles.column}>
      {quickAdd}
      <View style={[common.divider, {backgroundColor: borderColor}]} />
      {panel ?? (
      <PagedSection
        header="Next todos"
        rows={rows}
        rowHeight={rowHeight}
        heightKey="daily:todos"
        isCountableRow={row => row.kind === 'entry'}
        renderRow={renderRow}
        emptyHint="Nothing open - inbox zero!"
        textColor={textColor}
        borderColor={borderColor}
      />
      )}
      {footer}
      {failedItemNames.length > 0 && (
        <Text style={[common.error, common.sectionSpacingSmall, {color: textColor}]}>
          ⚠ Couldn't read {failedItemNames.length} item(s): {failedItemNames.join(', ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {flex: 1},
  groupHeading: {marginTop: 12},
});

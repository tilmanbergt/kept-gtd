/**
 * Daily's todos list (docs/dev/history/technical-design-daily-slim.md §3.1):
 * the Next todos, grouped by owner, and the line naming items that couldn't
 * be read, under the Quick Add zone (screens/daily/SelectionZone.tsx). The
 * list measures its own height; its height is remembered under `daily:todos`,
 * so a remount starts with the right page.
 *
 * Memoized, with stable props from DailyView: it does not read the selection,
 * so a tap on a row re-renders only that row
 * (docs/dev/history/technical-design-calmer-screens.md §3.1.3).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {DailyItemRef} from '../../storage/dailyAggregate';
import {common} from '../../ui/commonStyles';
import PagedSection from '../../ui/PagedSection';
import {taskRowHeight} from '../../ui/TaskRow';
import {FlatTaskRow, GROUP_HEADER_ROW_PX} from './dailyRows';
import {estimatorWidth} from '../../ui/ScreenSize';
import {usePerfRender} from '../../utils/perf';

interface Props {
  rows: FlatTaskRow[];
  renderEntry: (row: Extract<FlatTaskRow, {kind: 'entry'}>, heightPx: number) => React.ReactNode;
  onOpenItem: (item: DailyItemRef) => void;
  failedItemNames: string[];
  /** The hidden line (ui/context/HiddenLine.tsx) under the list. */
  footer?: React.ReactNode;
  textColor: string;
  borderColor: string;
}

function DailyTodosColumn({rows, renderEntry, onOpenItem, failedItemNames, footer, textColor, borderColor}: Props): React.JSX.Element {
  usePerfRender('DailyTodosColumn');
  const rowHeight = (row: FlatTaskRow) => (row.kind === 'header' ? GROUP_HEADER_ROW_PX : taskRowHeight(row.entry.task, estimatorWidth(), 'quiet'));
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
      {footer}
      {failedItemNames.length > 0 && (
        <Text style={[common.error, common.sectionSpacingSmall, {color: textColor}]}>
          ⚠ Couldn't read {failedItemNames.length} item(s): {failedItemNames.join(', ')}
        </Text>
      )}
    </View>
  );
}

export default React.memo(DailyTodosColumn);

const styles = StyleSheet.create({
  column: {flex: 1},
  groupHeading: {marginTop: 12},
});

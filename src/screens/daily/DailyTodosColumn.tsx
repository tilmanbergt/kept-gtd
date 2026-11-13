/**
 * Daily's todos list (docs/dev/history/technical-design-calmer-screens.md
 * §3.5, §3.6): the count tabs `Next · Waiting · Inbox · Done` and the list of
 * the chosen tab, grouped by owner, under the Quick Add zone
 * (screens/daily/SelectionZone.tsx); the hidden line under Next only, and the
 * line naming items that couldn't be read. Group headings are plain text: the
 * card's place link opens the Project/Area (quickadd-redesign §11 G2). The list measures its own height;
 * its height is remembered per tab, so a remount starts with the right page.
 *
 * Memoized, with stable props from DailyView: it does not read the selection,
 * so a tap on a row re-renders only that row (§3.1.3).
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {DailyTab} from '../../domain/listTabs';
import {common} from '../../ui/commonStyles';
import CountTabs, {CountTabDef} from '../../ui/CountTabs';
import PagedSection from '../../ui/PagedSection';
import {taskRowHeight} from '../../ui/TaskRow';
import {FlatTaskRow, GROUP_HEADER_ROW_PX} from './dailyRows';
import {estimatorWidth} from '../../ui/ScreenSize';
import {usePerfRender} from '../../utils/perf';

interface Props {
  /** The Inbox tab's list (screens/daily/InboxList.tsx), shown in place of the grouped list. */
  inboxList: React.ReactNode;
  tabs: CountTabDef<DailyTab>[];
  tab: DailyTab;
  onTabChange: (tab: DailyTab) => void;
  /** The chosen tab's rows. */
  rows: FlatTaskRow[];
  renderEntry: (row: Extract<FlatTaskRow, {kind: 'entry'}>, heightPx: number) => React.ReactNode;
  failedItemNames: string[];
  /** The hidden line (ui/context/HiddenLine.tsx) under Next. */
  footer?: React.ReactNode;
  textColor: string;
  borderColor: string;
}

const EMPTY_HINT: Record<DailyTab, string> = {
  next: 'Nothing next - pick something from a project.',
  waiting: 'Nothing to wait for today.',
  inbox: 'Inbox zero.',
  done: 'Nothing done today yet.',
};

function DailyTodosColumn({inboxList, tabs, tab, onTabChange, rows, renderEntry, failedItemNames, footer, textColor, borderColor}: Props): React.JSX.Element {
  usePerfRender('DailyTodosColumn');
  const rowHeight = (row: FlatTaskRow) => (row.kind === 'header' ? GROUP_HEADER_ROW_PX : taskRowHeight(row.entry.task, estimatorWidth(), 'quiet'));
  const renderRow = (row: FlatTaskRow) => {
    if (row.kind === 'header') {
      // Natural height: clipping it to GROUP_HEADER_ROW_PX would cut the text; the list measures its real viewport.
      return (
        <Text key={`header-${row.item.path}`} style={[common.subheading, styles.groupHeading, {color: textColor}]} numberOfLines={1}>
          {row.item.name}
        </Text>
      );
    }
    return renderEntry(row, rowHeight(row));
  };
  return (
    <View style={styles.column}>
      <CountTabs tabs={tabs} activeKey={tab} onChange={onTabChange} textColor={textColor} borderColor={borderColor} />
      {tab === 'inbox' ? inboxList : (
      <PagedSection
        header=""
        rows={rows}
        rowHeight={rowHeight}
        heightKey={`daily:todos:${tab}`}
        resetKey={tab}
        isCountableRow={row => row.kind === 'entry'}
        renderRow={renderRow}
        emptyHint={EMPTY_HINT[tab]}
        textColor={textColor}
        borderColor={borderColor}
      />
      )}
      {tab === 'next' ? footer : null}
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

/**
 * Week's and Month's right side under Quick Add
 * (docs/dev/history/technical-design-time-and-place.md §3.4, D16-D18): one
 * paged list - "Given time this week" (owners by scheduled time, hours on the
 * right, a grey line with blocks, meetings, todos done and the next todo),
 * then "Worked on this week" (todos done, nothing scheduled) - the Tend line
 * (threads and loops with nothing planned in 14 days, opening Review →
 * Tending threads) and the hidden line under the active context. A row opens
 * its owner: a thread's or loop's overview, a Project's or Area's page, the
 * Inbox. Built from the cache on every cache change, never by a timer.
 */
import React, {useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {NO_HIDDEN} from '../../domain/contexts';
import {GivenTimeOwner, GivenTimeRow, givenTimeDetail, givenTimeOf, givenTimeText, tendCount, tendLineText} from '../../domain/givenTime';
import {todayIso} from '../../domain/meetingTime';
import {GtdParaSettings} from '../../domain/settings';
import {threadTypesOf} from '../../domain/counterparts';
import {loopKindsOf} from '../../domain/loops';
import {CachedItem} from '../../storage/dataCache';
import {engageInboxOf, engageSourceOf} from '../../storage/engageAggregate';
import {buildLoopRoster} from '../../storage/loopRoster';
import {ProjectFileState} from '../../storage/projectFile';
import {buildTendingRoster} from '../../storage/tendingRoster';
import {log} from '../../utils/log';
import {common} from '../commonStyles';
import HiddenLine from '../context/HiddenLine';
import {ContextFilter} from '../context/useContextMatcher';
import {openOverview} from '../overviewStore';
import PagedSection from '../PagedSection';
import {FONT} from '../theme';

type Row = {kind: 'caption'; text: string} | {kind: 'owner'; row: GivenTimeRow};

const CAPTION_ROW_PX = 28;
/** Two lines: name and time 22, the grey line 18, padding 7 × 2, border 1 (design-device-rendering §3, like a 2-line meeting row). */
export const GIVEN_TIME_ROW_PX = 57;

interface Props {
  scope: 'week' | 'month';
  range: {start: string; end: string};
  items: readonly CachedItem[];
  inbox: ProjectFileState | null;
  inboxPath: string | null;
  settings: GtdParaSettings | null;
  filter: ContextFilter;
  onOpenItem: (path: string) => void;
  onOpenInbox?: () => void;
  onTend: () => void;
  textColor: string;
  borderColor: string;
}

export default function GivenTimePanel(props: Props): React.JSX.Element {
  const {scope, range, items, inbox, inboxPath, settings, filter, textColor, borderColor} = props;
  const noteSetups = settings?.noteSetups;
  const source = useMemo(() => engageSourceOf(items, engageInboxOf(inboxPath, inbox), noteSetups ?? []), [items, inbox, inboxPath, noteSetups]);
  const result = useMemo(() => givenTimeOf({source, range, matcher: filter.matcher}), [source, range, filter.matcher]);
  const today = todayIso();
  const tend = useMemo(() => {
    const threads = buildTendingRoster([...items], inbox && inboxPath ? {path: inboxPath, tasks: inbox.tasks, meetings: inbox.meetings} : null, threadTypesOf(noteSetups ?? []));
    const contextItems = (path: string) => {
      const owner = items.find(i => i.path === path);
      return !owner || filter.matcher.itemShown(owner);
    };
    const loops = buildLoopRoster(items, loopKindsOf(noteSetups ?? []), today);
    return tendCount(
      {
        threads: threads.filter(s => contextItems(s.owner.path)).flatMap(s => s.active),
        loops: loops.filter(s => contextItems(s.owner.path)).flatMap(s => s.loops.map(l => l.glance)),
      },
      today,
    );
  }, [items, inbox, inboxPath, noteSetups, today, filter.matcher]);
  useEffect(() => {
    log('GivenTime: built', `rows ${result.given.length + result.workedOn.length}`);
  }, [result]);

  const period = scope === 'week' ? 'this week' : 'this month';
  const rows: Row[] = [
    ...result.given.map(row => ({kind: 'owner' as const, row})),
    ...(result.workedOn.length > 0 ? [{kind: 'caption' as const, text: `Worked on ${period}`}, ...result.workedOn.map(row => ({kind: 'owner' as const, row}))] : []),
  ];
  const open = (owner: GivenTimeOwner) => {
    if (owner.kind === 'inbox') props.onOpenInbox?.();
    else if (owner.kind === 'item') props.onOpenItem(owner.itemPath);
    else openOverview({tag: owner.tag, ownerPath: owner.kind === 'thread' ? owner.scopeOwnerPath : owner.itemPath});
  };
  const renderRow = (row: Row) => {
    if (row.kind === 'caption') {
      return (
        <Text key={`caption:${row.text}`} style={[common.subheading, styles.caption, {color: textColor}]} numberOfLines={1}>
          {row.text}
        </Text>
      );
    }
    const r = row.row;
    const key = r.owner.kind === 'inbox' ? 'inbox' : r.owner.kind === 'item' ? r.owner.itemPath : `${r.owner.kind}:${r.owner.tag}`;
    return (
      <Pressable key={key} onPress={() => open(r.owner)} style={[styles.row, {borderBottomColor: borderColor}]}>
        <View style={styles.line1}>
          <Text style={[styles.name, {color: textColor}]} numberOfLines={1}>
            {r.name}
            <Text style={styles.kind}>{`  ${r.kindLabel}`}</Text>
          </Text>
          <Text style={[styles.time, {color: textColor}]}>{givenTimeText(r)}</Text>
        </View>
        <Text style={[styles.detail, {color: textColor}]} numberOfLines={1}>
          {givenTimeDetail(r)}
        </Text>
      </Pressable>
    );
  };
  const tendText = tendLineText(tend);
  return (
    <View style={styles.root}>
      <PagedSection
        header={`Given time ${period}`}
        rows={rows}
        rowHeight={row => (row.kind === 'caption' ? CAPTION_ROW_PX : GIVEN_TIME_ROW_PX)}
        resetKey={`${range.start}|${range.end}`}
        heightKey={`givenTime:${scope}`}
        isCountableRow={row => row.kind === 'owner'}
        renderRow={renderRow}
        emptyHint={`Nothing scheduled ${period} yet.`}
        textColor={textColor}
        borderColor={borderColor}
      />
      {tendText ? (
        <Pressable onPress={props.onTend} hitSlop={8} style={styles.tend}>
          <Text style={[styles.tendText, {color: textColor}]}>{tendText}</Text>
        </Pressable>
      ) : null}
      <HiddenLine
        text={filter.lineText({...NO_HIDDEN, items: result.hiddenOwners}, {one: 'owner', many: 'owners'})}
        onShow={filter.show}
        textColor={textColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  caption: {marginTop: 6, marginBottom: 4},
  row: {height: GIVEN_TIME_ROW_PX, paddingVertical: 7, borderBottomWidth: 1, overflow: 'hidden'},
  line1: {flexDirection: 'row', alignItems: 'center'},
  name: {flex: 1, fontSize: FONT.medium, fontWeight: '600', lineHeight: 22, includeFontPadding: false},
  kind: {fontSize: FONT.small, fontWeight: '400'},
  time: {fontSize: FONT.medium, fontWeight: '700', lineHeight: 22, marginLeft: 8, includeFontPadding: false},
  detail: {fontSize: FONT.small, lineHeight: 18, opacity: 0.6, includeFontPadding: false},
  tend: {paddingVertical: 6},
  tendText: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
});

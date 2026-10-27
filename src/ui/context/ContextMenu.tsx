/**
 * The context chip's menu (docs/dev/history/technical-design-time-and-place.md
 * §3.3, D21): an overlay over the tab body (screens/useAppOverlays.tsx) with
 * Everything and every context as radio rows - its one-line summary and how
 * many `#next` todos it shows - and "Edit contexts ›" (Settings → Contexts).
 * Choosing one stores `activeContextId` and says so in the status slot.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ContextDef, contextMatcher, contextSummary, EVERYTHING_LABEL} from '../../domain/contexts';
import {todayIso} from '../../domain/meetingTime';
import {CachedItem} from '../../storage/dataCache';
import {patchSettings} from '../../storage/settingsStorage';
import {errorMessage} from '../../utils/errorMessage';
import {log, logError} from '../../utils/log';
import {requestEinkRefresh} from '../../utils/screenRefresh';
import {useCachedItems} from '../useCachedItems';
import {useStatusApi} from '../status/StatusProvider';
import {useSettings} from '../useSettings';
import {COLORS, FONT, SPACING} from '../theme';

/** Open `#next` todos of the Projects and Areas `ctx` shows (Everything: all of them). */
export function nextCountOf(ctx: ContextDef | null, items: readonly CachedItem[]): number {
  const matcher = contextMatcher(ctx);
  const today = todayIso();
  let n = 0;
  for (const item of items) {
    if (item.loadError || item.status !== 'active') continue;
    for (const task of item.tasks) {
      if (!task.done && !task.cancelled && task.flowState === 'next' && matcher.taskShown(item, task, today)) n++;
    }
  }
  return n;
}

interface Props {
  onClose: () => void;
  onEditContexts: () => void;
  textColor: string;
  borderColor: string;
}

export default function ContextMenu({onClose, onEditContexts, textColor, borderColor}: Props): React.JSX.Element {
  const settings = useSettings();
  const items = useCachedItems();
  const statusApi = useStatusApi();
  const contexts = settings?.contexts ?? [];
  const activeId = settings?.activeContextId ?? '';

  const choose = (id: string, name: string) => {
    onClose();
    if (id === activeId) return;
    patchSettings({activeContextId: id})
      .then(() => {
        log('Context: switched', `${contexts.length} contexts`);
        const statusId = 'ContextMenu.switched';
        statusApi.show(statusId, {kind: 'success', text: `Context: ${name}`, scope: 'global', onDismiss: () => statusApi.clear(statusId)});
        requestEinkRefresh();
      })
      .catch(e => logError('ContextMenu: switching failed', errorMessage(e)));
  };

  const row = (id: string, name: string, summary: string, count: number) => {
    const on = id === activeId;
    return (
      <Pressable key={id || 'everything'} onPress={() => choose(id, name)} hitSlop={4} style={[styles.row, {borderColor}]} accessibilityRole="radio" accessibilityState={{checked: on}}>
        <Text style={[styles.radio, {color: textColor}]}>{on ? '●' : '○'}</Text>
        <View style={styles.rowMain}>
          <Text style={[styles.name, {color: textColor}, on && styles.nameOn]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.summary, {color: textColor}]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Text style={[styles.count, {color: textColor}]}>{count} next</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, {borderColor}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: textColor}]}>Context</Text>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={[styles.close, {color: textColor}]}>✕</Text>
        </Pressable>
      </View>
      {contexts.map(c => row(c.id, c.name || 'Unnamed', contextSummary(c), nextCountOf(c, items)))}
      {row('', EVERYTHING_LABEL, 'Shows all your projects, areas and todos', nextCountOf(null, items))}
      <Pressable
        onPress={() => {
          onClose();
          onEditContexts();
        }}
        hitSlop={8}
        style={styles.edit}>
        <Text style={[styles.editText, {color: textColor}]}>Edit contexts ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: SPACING.base,
    width: 460,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderTopWidth: 0,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
  },
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm},
  title: {fontSize: FONT.medium, fontWeight: '700'},
  close: {fontSize: FONT.medium, fontWeight: '600', paddingHorizontal: 6},
  row: {flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingVertical: 8},
  radio: {fontSize: FONT.medium, width: 28},
  rowMain: {flex: 1},
  name: {fontSize: FONT.medium},
  nameOn: {fontWeight: '700'},
  summary: {fontSize: FONT.small, opacity: 0.7},
  count: {fontSize: FONT.small, marginLeft: SPACING.sm},
  edit: {paddingTop: SPACING.sm, alignSelf: 'flex-start'},
  editText: {fontSize: FONT.medium, fontWeight: '600', textDecorationLine: 'underline'},
});

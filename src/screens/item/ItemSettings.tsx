/**
 * ⚙ Settings of a Project or Area (docs/dev/history/technical-design-calmer-screens.md
 * §3.8): a mode of screens/ItemDetail.tsx, in place of its two panes; `Close`
 * returns. Administration lives here, away from the working page.
 *
 * - Left: the name (read only - renaming is a folder rename), the
 *   abbreviation (AbbrevEditor), the scope (ui/ItemScopePanel.tsx), and
 *   status, Close out / Archive and the Area (StatusBlock).
 * - Right: "Show on this page" (ShowOnPage). While "Assign to Area…" is
 *   picking, the Files pane (`filesPane`, built by ItemDetail) takes its
 *   place, since the pick happens there.
 *
 * Every block writes the item's file itself, fresh from the cache; this
 * screen reads the item from the cache (useCachedItems), so each write shows
 * at once, and reports a changed file up (`onItemChanged`) so the page under
 * it is current when Close returns.
 */
import React, {useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {CachedItem} from '../../storage/dataCache';
import {pageShowCounts} from '../../storage/pageShowCounts';
import {LinkTarget} from '../../ui/FileBrowserPane';
import ItemScopePanel from '../../ui/ItemScopePanel';
import {FONT} from '../../ui/theme';
import {useCachedItems} from '../../ui/useCachedItems';
import {usePerfRender} from '../../utils/perf';
import AbbrevEditor from './AbbrevEditor';
import ShowOnPage from './ShowOnPage';
import StatusBlock from './StatusBlock';
import {useThreadRuleTypes} from '../thread/useTending';

interface Props {
  kind: 'project' | 'area';
  name: string;
  path: string;
  hasHomeNotebook: boolean;
  /** The Files pane, shown on the right while an Area is being picked. */
  filesPane: React.ReactNode;
  areaArming: boolean;
  onRequestAreaAssignment: (target: LinkTarget | null) => void;
  onOpenArea?: (areaName: string) => void;
  onArchived?: () => void;
  onStartCloseOut?: (projectPath: string) => void;
  /** The item's file changed here (a status, an abbreviation, a `show:` value...). */
  onItemChanged: (item: CachedItem) => void;
  onClose: () => void;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function ItemSettings({
  kind,
  name,
  path,
  hasHomeNotebook,
  filesPane,
  areaArming,
  onRequestAreaAssignment,
  onOpenArea,
  onArchived,
  onStartCloseOut,
  onItemChanged,
  onClose,
  textColor,
  borderColor,
  placeholderColor,
}: Props): React.JSX.Element {
  usePerfRender('ItemSettings');
  const items = useCachedItems();
  const ruleTypes = useThreadRuleTypes();
  const item = useMemo(
    () => items.find(i => i.path === path) ?? null,
    [items, path],
  );
  const rawContent = item?.rawContent;
  useEffect(() => {
    if (item) onItemChanged(item);
    // Only a changed file is news; `item` is the same object, updated in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContent]);
  const counts = useMemo(
    () => (item ? pageShowCounts(item, items, ruleTypes, hasHomeNotebook) : null),
    [item, items, ruleTypes, hasHomeNotebook],
  );

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, {color: textColor}]}>⚙ Settings</Text>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={[styles.doneButton, {borderColor: textColor}]}>
          <Text style={[styles.doneText, {color: textColor}]}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={[styles.leftPane, {borderColor}]}>
          <Text style={[styles.label, {color: textColor}]}>Name</Text>
          <Text style={[styles.value, {color: textColor}]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.label, {color: textColor}]}>Abbreviation</Text>
          <View style={styles.block}>
            <AbbrevEditor
              kind={kind}
              path={path}
              abbrev={item?.abbrev ?? null}
              textColor={textColor}
              borderColor={borderColor}
              placeholderColor={placeholderColor}
            />
          </View>
          <Text style={[styles.label, {color: textColor}]}>Scope</Text>
          <ItemScopePanel
            kind={kind}
            name={name}
            path={path}
            textColor={textColor}
            borderColor={borderColor}
            placeholderColor={placeholderColor}
          />
          <View style={[styles.divider, {backgroundColor: borderColor}]} />
          <StatusBlock
            kind={kind}
            name={name}
            path={path}
            onArchived={onArchived}
            onStartCloseOut={onStartCloseOut}
            onRequestAreaAssignment={onRequestAreaAssignment}
            onOpenArea={onOpenArea}
            textColor={textColor}
            borderColor={borderColor}
          />
        </View>
        <View style={styles.rightPane}>
          {areaArming ? (
            filesPane
          ) : item && counts ? (
            <ShowOnPage
              kind={kind}
              path={path}
              show={item.show}
              counts={counts}
              textColor={textColor}
              borderColor={borderColor}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  titleRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  title: {fontSize: FONT.medium, fontWeight: '700', flex: 1},
  doneButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  doneText: {fontSize: FONT.small, fontWeight: '600'},
  body: {flex: 1, flexDirection: 'row'},
  leftPane: {flex: 1, borderRightWidth: 1, paddingRight: 16, marginRight: 16},
  rightPane: {flex: 1},
  label: {fontSize: FONT.small, opacity: 0.7, marginBottom: 4},
  value: {fontSize: FONT.medium, marginBottom: 12},
  block: {marginBottom: 12},
  divider: {height: 1, marginVertical: 12},
});

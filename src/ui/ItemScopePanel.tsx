/**
 * The Current tab's left pane, pinned to the very TOP of the column, above
 * Files: Scope and the Given time line (ui/GivenTimeLine.tsx,
 * docs/dev/history/technical-design-time-and-place.md §3.4, D30).
 * ui/ItemStatusPanel.tsx (Status/Archive/Assign-to-Area) sits on the other
 * side of Files, so this is a separate component.
 *
 * Same "extract, don't lift" independent-load pattern ui/ItemStatusPanel.tsx's
 * module doc comment documents: this component does its own small
 * `ensureItemCached` load rather than sharing state with ItemStatusPanel,
 * synchronized only through the shared cache + write-through.
 *
 * Scope (docs/dev/history/technical-design-item-scope.md): a short free-text
 * description of what this Project/Area is about, tap-to-edit, never gated
 * by item status. Stored in the `## Scope` file span
 * (domain/markdown.ts's parseScopeSpan/writeScopeIntoContent), which
 * `ensureSkeleton` scaffolds (empty) into every new Project/Area. A save reads
 * the item fresh from the cache first and re-syncs this panel afterwards, so a
 * change made meanwhile by another panel on this screen is never overwritten.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {CachedItem, ensureItemCached, findCachedItem, updateItemScope} from '../storage/dataCache';
import {usePerfRender} from '../utils/perf';
import {saveScope} from '../storage/projectFile';
import {logError} from '../utils/log';
import {useEinkRefreshOnLoad} from '../utils/screenRefresh';
import {common} from './commonStyles';
import GivenTimeLine from './GivenTimeLine';
import {ItemScopeRow} from './ItemContextRows';
import {FONT} from './theme';
import {errorMessage} from '../utils/errorMessage';

interface Props {
  kind: 'project' | 'area';
  name: string;
  path: string;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function ItemScopePanel({kind, name, path, textColor, borderColor, placeholderColor}: Props): React.JSX.Element | null {
  usePerfRender('ItemScopePanel');
  // A copy of the shared cache entry (re-synced after every write below). A
  // cached item is there in the first render, so the panel has its height in
  // the first layout (docs/dev/history/technical-design-perf-current-page.md §3.5).
  const [state, setState] = useState<CachedItem | null>(() => {
    const cached = findCachedItem(path);
    return cached && !cached.loadError ? {...cached} : null;
  });
  useEinkRefreshOnLoad(state === null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const item = await ensureItemCached(kind, name, path);
      if (item.loadError) throw new Error(item.loadError);
      setState(prev => (prev && prev.rawContent === item.rawContent ? prev : {...item}));
    } catch (e) {
      const message = errorMessage(e);
      logError('ItemScopePanel: load failed', kind, path, message);
      setLoadError(message);
    }
  }, [kind, name, path]);

  useEffect(() => {
    load();
  }, [load]);

  /** Saves Scope: never touches frontmatter, so no status gate. */
  const handleSaveScope = async (text: string) => {
    const item = findCachedItem(path) ?? state;
    if (!item) return;
    const nextRaw = await saveScope(kind, path, item.rawContent, text);
    updateItemScope(path, nextRaw, text);
    const fresh = findCachedItem(path);
    if (fresh) setState({...fresh});
  };

  if (loadError) {
    return (
      <View style={styles.root}>
        <Text style={[common.error, {color: textColor}]}>⚠ {loadError}</Text>
      </View>
    );
  }
  if (!state) return null;

  return (
    <View style={styles.root}>
      <Text style={[styles.sectionTitle, {color: textColor}]}>Scope</Text>
      <ItemScopeRow scope={state.scope} onSaveScope={handleSaveScope} textColor={textColor} borderColor={borderColor} placeholderColor={placeholderColor} />
      <GivenTimeLine path={path} textColor={textColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: FONT.medium,
    fontWeight: '600',
    marginBottom: 10,
  },
});

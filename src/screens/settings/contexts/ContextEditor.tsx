/**
 * Settings → Contexts, right column (docs/dev/history/technical-design-contexts-tags.md §2.4, §8).
 * A header on every tab: the name with Save (active only after a change) and Delete, the sentence
 * of what the draft shows (two lines reserved at the device's font scale) and how many next todos it
 * shows. Then General (name, meetings outside, Given time) · Show · Except. Show and Except list
 * Areas, Projects or Tags as paged chips; a tap adds or removes an entry;
 * "Only inside the selected areas and projects" while Show names both parts. Everything opens with
 * only its Given time threshold.
 */
import React, {useEffect, useState} from 'react';
import {PixelRatio, Pressable, StyleSheet, Text, View} from 'react-native';
import {ContextDef, ContextEntry, ContextKinds, contextSentence, nextCountOf, sameEntry} from '../../../domain/contexts';
import {isContextTag} from '../../../domain/flowState';
import {CachedItem} from '../../../storage/dataCache';
import {getRecentTags} from '../../../storage/tagUsage';
import ClipboardTextInput from '../../../ui/ClipboardTextInput';
import MiniTabs, {MiniTabDef} from '../../../ui/MiniTabs';
import PagedChipGrid, {ChipPager, useChipPages} from '../../../ui/PagedChipGrid';
import {FONT} from '../../../ui/theme';
import {useCachedItems} from '../../../ui/useCachedItems';
import {errorMessage} from '../../../utils/errorMessage';
import {logWarn} from '../../../utils/log';
import {styles} from '../settingsStyles';
import CheckToggle from '../CheckToggle';
import {setupStyles} from '../noteSetups/noteSetupsStyles';
import NewTagRow from './NewTagRow';
import GivenTimeThreshold from './GivenTimeThreshold';
import {ContextEditorTab, ContextsDraft} from './useContextsDraft';

/** Context tags of open todos and meetings, most used first: what a context can name besides the recently typed tags. */
function tagsInFiles(items: readonly CachedItem[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const tagLists = [...item.tasks.filter(t => !t.done && !t.cancelled).map(t => t.tags), ...item.meetings.filter(m => !m.cancelled).map(m => m.tags)];
    for (const tags of tagLists) for (const tag of tags) if (isContextTag(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

type ChipKind = 'areas' | 'projects' | 'tags';
const KINDS: MiniTabDef<ChipKind>[] = [
  {key: 'areas', label: 'Areas'},
  {key: 'projects', label: 'Projects'},
  {key: 'tags', label: 'Tags'},
];
const TAB_LABEL: Record<ContextEditorTab, string> = {general: 'General', shows: 'Show', hides: 'Except'};

const OUTSIDE: MiniTabDef<ContextDef['outsideMeetings']>[] = [
  {key: 'dim', label: 'Dimmed'},
  {key: 'show', label: 'Shown as usual'},
];

/** Two lines of the sentence at the device's font scale (FONT.small, with room for the line gap). */
const SENTENCE_HEIGHT = 2 * Math.ceil(FONT.small * 1.35 * PixelRatio.getFontScale());

interface Props {
  draft: ContextsDraft;
  kinds: ContextKinds;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function ContextEditor({draft, kinds: setupKinds, textColor, borderColor, placeholderColor}: Props): React.JSX.Element | null {
  const items = useCachedItems();
  const [tags, setTags] = useState<string[]>([]);
  const [kind, setKind] = useState<ChipKind>('areas');
  useEffect(() => {
    let cancelled = false;
    getRecentTags()
      .then(t => {
        if (!cancelled) setTags(t);
      })
      .catch(e => logWarn('ContextEditor: reading tags in use failed', errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);
  const ctx = draft.draft;
  const tab = draft.tab;
  const side = tab === 'general' ? null : tab;
  // The tags on this side when the tab was opened come first, and stay put while it is open.
  const orderKey = `${ctx?.id}|${tab}|${kind}`;
  const [opened, setOpened] = useState({key: '', tags: [] as string[]});
  const sideTags = ctx && side ? ctx[side].flatMap(e => (e.kind === 'tag' ? [e.tag] : [])) : [];
  if (ctx && opened.key !== orderKey) setOpened({key: orderKey, tags: sideTags});

  const live = items.filter(i => !i.loadError && i.status !== 'archived');
  const named = ctx ? [...ctx.shows, ...ctx.hides].flatMap(e => (e.kind === 'tag' ? [e.tag] : [])) : [];
  const roots = [...setupKinds.loopKinds, ...setupKinds.threadTypes];
  const inUse = [...tags.map(t => t.toLowerCase()), ...tagsInFiles(live)].filter(t => !t.includes('/'));
  const tagOrder = Array.from(new Set([...opened.tags, ...named.filter(t => !roots.includes(t)), ...roots, ...inUse]));
  const kindItems = live.filter(i => i.kind === (kind === 'areas' ? 'area' : 'project'));
  const pages = useChipPages(kind === 'tags' ? tagOrder.length : kindItems.length, orderKey);

  if (!ctx && draft.everythingOpen) {
    return (
      <View style={setupStyles.page}>
        <Text style={[setupStyles.setupRowName, {color: textColor}]}>Everything</Text>
        <Text style={[styles.pathPreview, {color: textColor}]}>All your projects, areas and todos. Contexts without their own threshold use this one too.</Text>
        <GivenTimeThreshold value={draft.minMinutes} onChange={draft.setMinMinutes} textColor={textColor} borderColor={borderColor} />
      </View>
    );
  }
  if (!ctx) {
    return <Text style={[styles.label, {color: textColor}]}>Tap a context on the left to edit it, or create a new one.</Text>;
  }
  const list = side ? ctx[side] : [];
  const other = side === 'shows' ? ctx.hides : ctx.shows;
  const chip = (entry: ContextEntry, label: string) => ({
    key: entry.kind === 'item' ? `${entry.itemKind}:${entry.name}` : `#${entry.tag}`,
    label: other.some(e => sameEntry(e, entry)) ? `${label} (${side === 'shows' ? 'excepted' : 'shown'})` : label,
    on: list.some(e => sameEntry(e, entry)),
    onPress: () => draft.toggle(entry),
  });
  const rootLabel = (t: string) => (setupKinds.loopKinds.includes(t) ? `All #${t} loops` : setupKinds.threadTypes.includes(t) ? `All #${t} threads` : `#${t}`);
  const chips =
    kind === 'tags'
      ? tagOrder.map(t => chip({kind: 'tag', tag: t}, rootLabel(t)))
      : kindItems.map(i => chip({kind: 'item', itemKind: i.kind, name: i.name}, i.name));
  const bothParts = ctx.shows.some(e => e.kind === 'item') && ctx.shows.some(e => e.kind === 'tag');
  const count = (k: ChipKind) => list.filter(e => (k === 'tags' ? e.kind === 'tag' : e.kind === 'item' && e.itemKind === (k === 'areas' ? 'area' : 'project'))).length;
  const kindTabs = KINDS.map(t => ({...t, label: count(t.key) > 0 ? `${t.label} ${count(t.key)}` : t.label}));
  const tabs = (['general', 'shows', 'hides'] as const).map(key => ({
    key,
    label: key !== 'general' && ctx[key].length > 0 ? `${TAB_LABEL[key]} ${ctx[key].length}` : TAB_LABEL[key],
  }));

  return (
    <View style={setupStyles.page}>
      <View style={local.fixed}>
        <View style={local.nameRow}>
          <Text style={[local.name, {color: textColor}]} numberOfLines={1}>
            {ctx.name.trim() || 'New context'}
          </Text>
          <Pressable
            style={[styles.saveButton, setupStyles.headerSave, local.save, !draft.changed && local.saveIdle]}
            onPress={draft.handleSave}
            disabled={!draft.changed}
            accessibilityRole="button"
            accessibilityLabel="Save"
            accessibilityState={{disabled: !draft.changed}}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
          <Pressable onPress={draft.handleDelete} hitSlop={8}>
            <Text style={[setupStyles.headerAction, {color: textColor}]}>{draft.isNew ? 'Discard' : 'Delete'}</Text>
          </Pressable>
        </View>
        <Text style={[local.sentence, {color: textColor}]} numberOfLines={2}>
          {contextSentence(ctx, setupKinds)}
        </Text>
        <Text style={[styles.pathPreview, {color: textColor}]} numberOfLines={1}>
          Shows {nextCountOf(ctx, items)} of {nextCountOf(null, items)} next todos
        </Text>
        <MiniTabs tabs={tabs} activeKey={tab} onChange={draft.setTab} textColor={textColor} borderColor={borderColor} />
      </View>
      {side === null ? (
        <View style={local.fixed}>
          <Text style={[styles.label, {color: textColor}]}>Name</Text>
          <View style={local.nameField}>
            <ClipboardTextInput value={ctx.name} onChangeText={draft.setName} placeholder="e.g. Work, Home, Café" placeholderColor={placeholderColor} textColor={textColor} borderColor={borderColor} />
          </View>
          <Text style={[styles.label, {color: textColor}]}>Meetings outside this context</Text>
          <MiniTabs tabs={OUTSIDE} activeKey={ctx.outsideMeetings} onChange={draft.setOutsideMeetings} textColor={textColor} borderColor={borderColor} />
          <GivenTimeThreshold value={draft.minMinutes} onChange={draft.setMinMinutes} textColor={textColor} borderColor={borderColor} />
        </View>
      ) : (
        <>
          <View style={local.fixed}>
            <MiniTabs tabs={kindTabs} activeKey={kind} onChange={setKind} trailing={<ChipPager pages={pages} textColor={textColor} />} textColor={textColor} borderColor={borderColor} />
            {side === 'shows' && bothParts ? (
              <CheckToggle label="Only inside the selected areas and projects" checked={!!ctx.onlyInPlaces} onPress={() => draft.setOnlyInPlaces(!ctx.onlyInPlaces)} textColor={textColor} />
            ) : null}
            {kind === 'tags' ? <NewTagRow onAdd={draft.addTag} textColor={textColor} borderColor={borderColor} placeholderColor={placeholderColor} /> : null}
          </View>
          <View style={local.chips}>
            <PagedChipGrid chips={chips} pages={pages} textColor={textColor} borderColor={borderColor} />
          </View>
        </>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  fixed: {flexShrink: 0},
  nameRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  name: {flex: 1, fontSize: FONT.large, fontWeight: '700', marginRight: 12},
  save: {marginRight: 12},
  saveIdle: {opacity: 0.3},
  // A row, so the field's flex: 1 fills the width; in this column it would get no height (design-device-rendering §5.3).
  nameField: {flexDirection: 'row', marginBottom: 8},
  chips: {flex: 1, marginTop: 4},
  sentence: {fontSize: FONT.small, fontWeight: '600', minHeight: SENTENCE_HEIGHT},
});

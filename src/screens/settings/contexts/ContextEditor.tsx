/**
 * Settings → Contexts, right column (docs/dev/history/technical-design-contexts-tags.md
 * §2.4): the name with Save and Delete; the sentence of what the draft shows;
 * Show and Except; one chip list at a time - Areas (an Area brings its
 * Projects), Projects, or Tags (ContextTagsPanel) - where a tap adds or
 * removes an entry; "Only inside the selected areas and projects" while Show
 * names both; meetings outside dimmed or shown as usual; the Given time
 * threshold; a preview of how many `#next` todos it shows. Every row but the
 * chip list keeps its height, so the name and Save always fit on the screen.
 * Everything opens with only its Given time threshold.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ContextDef, ContextEntry, ContextKinds, contextSentence, nextCountOf, sameEntry} from '../../../domain/contexts';
import {isContextTag} from '../../../domain/flowState';
import {CachedItem} from '../../../storage/dataCache';
import {getRecentTags} from '../../../storage/tagUsage';
import ClipboardTextInput from '../../../ui/ClipboardTextInput';
import MiniTabs, {MiniTabDef} from '../../../ui/MiniTabs';
import TagChipGrid from '../../../ui/TagChipGrid';
import {FONT} from '../../../ui/theme';
import {useCachedItems} from '../../../ui/useCachedItems';
import {errorMessage} from '../../../utils/errorMessage';
import {logWarn} from '../../../utils/log';
import {styles} from '../settingsStyles';
import CheckToggle from '../CheckToggle';
import {setupStyles} from '../noteSetups/noteSetupsStyles';
import ContextTagsPanel from './ContextTagsPanel';
import GivenTimeThreshold from './GivenTimeThreshold';
import {ContextListSide, ContextsDraft} from './useContextsDraft';

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

const SIDE_LABEL: Record<ContextListSide, string> = {shows: 'Show', hides: 'Except'};
type ChipKind = 'areas' | 'projects' | 'tags';
const KINDS: MiniTabDef<ChipKind>[] = [
  {key: 'areas', label: 'Areas'},
  {key: 'projects', label: 'Projects'},
  {key: 'tags', label: 'Tags'},
];
const KIND_HINT: Record<ChipKind, string> = {
  areas: 'An Area brings its Projects.',
  projects: 'Projects one by one, e.g. one without an Area.',
  tags: 'Todos and meetings with the tag, wherever they live. A loop or thread type brings all its loops or threads.',
};

const OUTSIDE: MiniTabDef<ContextDef['outsideMeetings']>[] = [
  {key: 'dim', label: 'Dimmed'},
  {key: 'show', label: 'Shown as usual'},
];

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
  const list = draft.side === 'shows' ? ctx.shows : ctx.hides;
  const other = draft.side === 'shows' ? ctx.hides : ctx.shows;
  const chip = (entry: ContextEntry, label: string) => ({
    key: entry.kind === 'item' ? `${entry.itemKind}:${entry.name}` : `#${entry.tag}`,
    label: other.some(e => sameEntry(e, entry)) ? `${label} (${draft.side === 'shows' ? 'excepted' : 'shown'})` : label,
    on: list.some(e => sameEntry(e, entry)),
    onPress: () => draft.toggle(entry),
  });
  const live = items.filter(i => !i.loadError && i.status !== 'archived');
  const areas = live.filter(i => i.kind === 'area').map(i => chip({kind: 'item', itemKind: 'area', name: i.name}, i.name));
  const projects = live.filter(i => i.kind === 'project').map(i => chip({kind: 'item', itemKind: 'project', name: i.name}, i.name));
  const named = [...ctx.shows, ...ctx.hides].flatMap(e => (e.kind === 'tag' ? [e.tag] : []));
  const inUse = [...tags.map(t => t.toLowerCase()), ...tagsInFiles(live)].filter(t => !t.includes('/'));
  const shown = nextCountOf(ctx, items);
  const all = nextCountOf(null, items);
  const bothParts = ctx.shows.some(e => e.kind === 'item') && ctx.shows.some(e => e.kind === 'tag');

  const count = (k: ChipKind) => [...ctx.shows, ...ctx.hides].filter(e => (k === 'tags' ? e.kind === 'tag' : e.kind === 'item' && e.itemKind === (k === 'areas' ? 'area' : 'project'))).length;
  const kindTabs = KINDS.map(t => ({...t, label: count(t.key) > 0 ? `${t.label} ${count(t.key)}` : t.label}));
  const sides = (['shows', 'hides'] as const).map(key => ({key, label: ctx[key].length > 0 ? `${SIDE_LABEL[key]} ${ctx[key].length}` : SIDE_LABEL[key]}));

  return (
    <View style={setupStyles.page}>
      <View style={local.fixed}>
        <Text style={[styles.label, {color: textColor}]}>Name</Text>
        <View style={local.nameRow}>
          <View style={local.nameInput}>
            <ClipboardTextInput value={ctx.name} onChangeText={draft.setName} placeholder="e.g. Work, Home, Café" placeholderColor={placeholderColor} textColor={textColor} borderColor={borderColor} />
          </View>
          <Pressable style={[styles.saveButton, setupStyles.headerSave, local.save]} onPress={draft.handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
          <Pressable onPress={draft.handleDelete} hitSlop={8}>
            <Text style={[setupStyles.headerAction, {color: textColor}]}>{draft.isNew ? 'Discard' : 'Delete'}</Text>
          </Pressable>
        </View>
        <Text style={[local.sentence, {color: textColor}]} numberOfLines={2}>
          {contextSentence(ctx, setupKinds)}
        </Text>
        <MiniTabs tabs={sides} activeKey={draft.side} onChange={draft.setSide} textColor={textColor} borderColor={borderColor} />
        <MiniTabs tabs={kindTabs} activeKey={kind} onChange={setKind} textColor={textColor} borderColor={borderColor} />
        <Text style={[styles.pathPreview, {color: textColor}]}>{KIND_HINT[kind]}</Text>
        {draft.side === 'shows' && bothParts ? (
          <CheckToggle label="Only inside the selected areas and projects" checked={!!ctx.onlyInPlaces} onPress={() => draft.setOnlyInPlaces(!ctx.onlyInPlaces)} textColor={textColor} />
        ) : null}
      </View>
      <View style={local.chips}>
        {kind === 'tags' ? (
          <ContextTagsPanel named={named} inUse={inUse} kinds={setupKinds} chip={(tag, label) => chip({kind: 'tag', tag}, label)} onAdd={draft.addTag} textColor={textColor} borderColor={borderColor} placeholderColor={placeholderColor} />
        ) : (
          <TagChipGrid chips={kind === 'areas' ? areas : projects} maxChips={40} maxLabelChars={24} textColor={textColor} borderColor={borderColor} />
        )}
      </View>
      <View style={local.fixed}>
        <Text style={[styles.label, {color: textColor}]}>Meetings outside this context</Text>
        <MiniTabs tabs={OUTSIDE} activeKey={ctx.outsideMeetings} onChange={draft.setOutsideMeetings} textColor={textColor} borderColor={borderColor} />
        <GivenTimeThreshold value={draft.minMinutes} onChange={draft.setMinMinutes} textColor={textColor} borderColor={borderColor} />
        <Text style={[styles.pathPreview, {color: textColor}]}>
          Preview: shows {shown} of {all} next todos. The Inbox always shows.
        </Text>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  fixed: {flexShrink: 0},
  nameRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  nameInput: {flex: 1, marginRight: 12},
  save: {marginRight: 12},
  chips: {flex: 1, overflow: 'hidden', marginVertical: 4},
  // Two lines always, so the rows below never move.
  sentence: {fontSize: FONT.small, fontWeight: '600', lineHeight: 20, height: 40, marginBottom: 4},
});

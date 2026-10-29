/**
 * Settings → Contexts, right column (docs/dev/history/technical-design-time-and-place.md
 * §3.3, D20, D23): the name with Save and Delete on one row at the top; Shows
 * and Hides; one chip list at a time - Areas (an Area brings its Projects,
 * the usual case), Projects, or plain tags in use (a loop or thread tag only
 * once a context names it) - where a tap adds or removes an entry; meetings
 * outside the context dimmed or shown as usual; a preview of how many `#next`
 * todos it shows; from how much time loops and counterparts show in Given
 * time. Save and Delete write at once. Every row but the chip list keeps its
 * height, so the name and Save always fit on the screen. Everything opens
 * with only its Given time threshold.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ContextDef, ContextEntry, nextCountOf, sameEntry} from '../../../domain/contexts';
import {todayIso} from '../../../domain/meetingTime';
import {isContextTag} from '../../../domain/flowState';
import {CachedItem} from '../../../storage/dataCache';
import {getRecentTags} from '../../../storage/tagUsage';
import ClipboardTextInput from '../../../ui/ClipboardTextInput';
import MiniTabs, {MiniTabDef} from '../../../ui/MiniTabs';
import TagChipGrid from '../../../ui/TagChipGrid';
import {useCachedItems} from '../../../ui/useCachedItems';
import {errorMessage} from '../../../utils/errorMessage';
import {logWarn} from '../../../utils/log';
import {styles} from '../settingsStyles';
import {setupStyles} from '../noteSetups/noteSetupsStyles';
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

const SIDES: MiniTabDef<ContextListSide>[] = [
  {key: 'shows', label: 'Shows'},
  {key: 'hides', label: 'Hides'},
];
type ChipKind = 'areas' | 'projects' | 'tags';
const KINDS: MiniTabDef<ChipKind>[] = [
  {key: 'areas', label: 'Areas'},
  {key: 'projects', label: 'Projects'},
  {key: 'tags', label: 'Tags'},
];
const KIND_HINT: Record<ChipKind, string> = {
  areas: 'An Area brings its Projects.',
  projects: 'Projects one by one, e.g. one without an Area.',
  tags: 'Todos and meetings with the tag, wherever they live.',
};

const OUTSIDE: MiniTabDef<ContextDef['outsideMeetings']>[] = [
  {key: 'dim', label: 'Dimmed'},
  {key: 'show', label: 'Shown as usual'},
];

interface Props {
  draft: ContextsDraft;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function ContextEditor({draft, textColor, borderColor, placeholderColor}: Props): React.JSX.Element | null {
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
    label: other.some(e => sameEntry(e, entry)) ? `${label} (${draft.side === 'shows' ? 'hidden' : 'shown'})` : label,
    on: list.some(e => sameEntry(e, entry)),
    onPress: () => draft.toggle(entry),
  });
  const live = items.filter(i => !i.loadError && i.status !== 'archived');
  const areas = live.filter(i => i.kind === 'area').map(i => chip({kind: 'item', itemKind: 'area', name: i.name}, i.name));
  const projects = live.filter(i => i.kind === 'project').map(i => chip({kind: 'item', itemKind: 'project', name: i.name}, i.name));
  // Plain tags by default; a loop's or thread's tag (nested) only once the context names it.
  const named = [...ctx.shows, ...ctx.hides].flatMap(e => (e.kind === 'tag' ? [e.tag] : []));
  const tagSet = Array.from(new Set([...named, ...[...tags.map(t => t.toLowerCase()), ...tagsInFiles(live)].filter(t => !t.includes('/'))]));
  const tagChips = tagSet.map(tag => chip({kind: 'tag', tag}, `#${tag}`));
  const shown = nextCountOf(ctx, items, todayIso());
  const all = nextCountOf(null, items, todayIso());

  const chips = kind === 'areas' ? areas : kind === 'projects' ? projects : tagChips;
  const count = (k: ChipKind) => [...ctx.shows, ...ctx.hides].filter(e => (k === 'tags' ? e.kind === 'tag' : e.kind === 'item' && e.itemKind === (k === 'areas' ? 'area' : 'project'))).length;
  const kinds = KINDS.map(t => ({...t, label: count(t.key) > 0 ? `${t.label} ${count(t.key)}` : t.label}));

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
        <MiniTabs tabs={SIDES} activeKey={draft.side} onChange={draft.setSide} textColor={textColor} borderColor={borderColor} />
        <MiniTabs tabs={kinds} activeKey={kind} onChange={setKind} textColor={textColor} borderColor={borderColor} />
        <Text style={[styles.pathPreview, {color: textColor}]}>{KIND_HINT[kind]}</Text>
      </View>
      <View style={local.chips}>
        <TagChipGrid chips={chips} maxChips={40} maxLabelChars={24} textColor={textColor} borderColor={borderColor} />
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
});

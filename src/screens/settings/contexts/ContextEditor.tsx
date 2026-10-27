/**
 * Settings → Contexts, right column (docs/dev/history/technical-design-time-and-place.md
 * §3.3, D20, D23): the name; Shows and Hides as chip lists - Areas (an Area
 * brings its Projects), Projects and tags in use (loop and thread tags too) -
 * where a tap adds or removes an entry; meetings outside the context dimmed or
 * shown as usual; a preview of how many `#next` todos it shows. Save and
 * Delete write at once.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {ContextDef, ContextEntry, sameEntry} from '../../../domain/contexts';
import {isContextTag} from '../../../domain/flowState';
import {CachedItem} from '../../../storage/dataCache';
import {getRecentTags} from '../../../storage/tagUsage';
import ClipboardTextInput from '../../../ui/ClipboardTextInput';
import MiniTabs, {MiniTabDef} from '../../../ui/MiniTabs';
import TagChipGrid from '../../../ui/TagChipGrid';
import {nextCountOf} from '../../../ui/context/ContextMenu';
import {useCachedItems} from '../../../ui/useCachedItems';
import {errorMessage} from '../../../utils/errorMessage';
import {logWarn} from '../../../utils/log';
import {styles} from '../settingsStyles';
import {setupStyles} from '../noteSetups/noteSetupsStyles';
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
  const tagSet = Array.from(
    new Set([...[...ctx.shows, ...ctx.hides].flatMap(e => (e.kind === 'tag' ? [e.tag] : [])), ...tags.map(t => t.toLowerCase()), ...tagsInFiles(live)]),
  );
  const tagChips = tagSet.map(tag => chip({kind: 'tag', tag}, `#${tag}`));
  const shown = nextCountOf(ctx, items);
  const all = nextCountOf(null, items);

  return (
    <View style={setupStyles.page}>
      <Text style={[styles.label, {color: textColor}]}>Name</Text>
      <ClipboardTextInput value={ctx.name} onChangeText={draft.setName} placeholder="e.g. Work, Home, Café" placeholderColor={placeholderColor} textColor={textColor} borderColor={borderColor} />
      <MiniTabs tabs={SIDES} activeKey={draft.side} onChange={draft.setSide} textColor={textColor} borderColor={borderColor} />
      <Text style={[styles.label, {color: textColor}]}>Areas (an Area brings its Projects)</Text>
      <TagChipGrid chips={areas} maxChips={20} maxLabelChars={24} textColor={textColor} borderColor={borderColor} />
      <Text style={[styles.label, {color: textColor}]}>Projects</Text>
      <TagChipGrid chips={projects} maxChips={20} maxLabelChars={24} textColor={textColor} borderColor={borderColor} />
      <Text style={[styles.label, {color: textColor}]}>Tags, loops and threads</Text>
      <TagChipGrid chips={tagChips} maxChips={24} maxLabelChars={24} textColor={textColor} borderColor={borderColor} />
      <Text style={[styles.label, {color: textColor}]}>Meetings outside this context</Text>
      <MiniTabs tabs={OUTSIDE} activeKey={ctx.outsideMeetings} onChange={draft.setOutsideMeetings} textColor={textColor} borderColor={borderColor} />
      <Text style={[styles.pathPreview, {color: textColor}]}>
        Preview: shows {shown} of {all} next todos. The Inbox and todos due today or earlier always show.
      </Text>
      <View style={setupStyles.headerButtons}>
        <Pressable style={[styles.saveButton, setupStyles.headerSave]} onPress={draft.handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
        <Pressable onPress={draft.handleDelete} hitSlop={8}>
          <Text style={[setupStyles.headerAction, {color: textColor}]}>{draft.isNew ? 'Discard' : 'Delete'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

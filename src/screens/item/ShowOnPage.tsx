/**
 * "Show on this page" on a Project's or Area's ⚙ Settings
 * (docs/dev/history/technical-design-calmer-screens.md §3.8): one row per
 * part - Auto (shown when there is something), Always, Never - and "Left side
 * opens on". Each tap writes the `show:` frontmatter line at once
 * (domain/pageShow.ts; the default removes its token, all defaults remove the
 * line), fresh from the cache so a field written meanwhile is kept, and
 * write-through into the cache. A part set to Never that has content says so
 * ("Never · 2 loops"), so nothing is hidden silently.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  hiddenHint,
  OpenRule,
  openRule,
  OPEN_RULES,
  PageShow,
  ShowCounts,
  ShowPart,
  showValue,
  ShowValue,
  SHOW_VALUES,
  withOpenRule,
  withShowValue,
} from '../../domain/pageShow';
import {
  findCachedItem,
  frontMatterOf,
  updateItemFrontMatter,
} from '../../storage/dataCache';
import {saveFrontMatter} from '../../storage/projectFile';
import {useErrorStatus} from '../../ui/status/StatusProvider';
import {COLORS, FONT} from '../../ui/theme';
import {errorMessage} from '../../utils/errorMessage';
import {log, logError} from '../../utils/log';

const PART_LABEL: Record<ShowPart, string> = {
  threads: 'Threads',
  loops: 'Loops',
  agreements: 'Agreements',
  schedule: 'Schedule',
  notebook: 'Notebook',
  projects: 'Projects',
};

const VALUE_LABEL: Record<ShowValue, string> = {
  auto: 'Auto',
  always: 'Always',
  never: 'Never',
};
const OPEN_LABEL: Record<OpenRule, string> = {
  first: 'First with content',
  notebook: 'Notebook',
  files: 'Files',
  threads: 'Threads',
};

/** The parts a page of this kind has: Projects only on an Area. */
export function partsFor(kind: 'project' | 'area'): ShowPart[] {
  const parts: ShowPart[] = [
    'threads',
    'loops',
    'agreements',
    'schedule',
    'notebook',
  ];
  return kind === 'area' ? [...parts, 'projects'] : parts;
}

interface Props {
  kind: 'project' | 'area';
  path: string;
  show: PageShow;
  counts: ShowCounts;
  textColor: string;
  borderColor: string;
}

export default function ShowOnPage({
  kind,
  path,
  show,
  counts,
  textColor,
  borderColor,
}: Props): React.JSX.Element {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useErrorStatus('ShowOnPage.error', error, () => setError(null));

  const write = (next: (current: PageShow) => PageShow, what: string) => {
    const current = findCachedItem(path);
    if (!current || pending) return;
    const fm = {...frontMatterOf(current), show: next(current.show)};
    setPending(true);
    setError(null);
    saveFrontMatter(kind, path, current.rawContent, fm)
      .then(nextRaw => {
        updateItemFrontMatter(path, nextRaw, fm);
        log(`ItemSettings: show set ${what}`);
      })
      .catch(e => {
        logError('ItemSettings: show set failed', errorMessage(e));
        setError(errorMessage(e));
      })
      .finally(() => setPending(false));
  };

  const currentOpen = openRule(show);
  return (
    <View>
      <Text style={[styles.title, {color: textColor}]}>Show on this page</Text>
      {partsFor(kind).map(part => {
        const value = showValue(show, part);
        const hint = hiddenHint(show, part, counts[part]);
        return (
          <View key={part} style={styles.row}>
            <Text style={[styles.label, {color: textColor}]} numberOfLines={1}>
              {PART_LABEL[part]}
            </Text>
            <Segments
              options={SHOW_VALUES.map(v => ({
                value: v,
                label: VALUE_LABEL[v],
              }))}
              selected={value}
              disabled={pending}
              accessibilityPrefix={PART_LABEL[part]}
              onSelect={v =>
                write(s => withShowValue(s, part, v), `part=${part} value=${v}`)
              }
              textColor={textColor}
              borderColor={borderColor}
            />
            {hint && (
              <Text style={[styles.hint, {color: textColor}]}>{hint}</Text>
            )}
          </View>
        );
      })}
      <Text style={[styles.subtitle, {color: textColor}]}>
        Left side opens on
      </Text>
      <Segments
        options={OPEN_RULES.map(r => ({value: r, label: OPEN_LABEL[r]}))}
        selected={currentOpen}
        disabled={pending}
        accessibilityPrefix="Opens on"
        onSelect={r => write(s => withOpenRule(s, r), `open=${r}`)}
        textColor={textColor}
        borderColor={borderColor}
      />
    </View>
  );
}

function Segments<T extends string>({
  options,
  selected,
  disabled,
  accessibilityPrefix,
  onSelect,
  textColor,
  borderColor,
}: {
  options: {value: T; label: string}[];
  selected: T;
  disabled: boolean;
  accessibilityPrefix: string;
  onSelect: (value: T) => void;
  textColor: string;
  borderColor: string;
}): React.JSX.Element {
  return (
    <View style={styles.segments}>
      {options.map(option => {
        const on = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => !on && onSelect(option.value)}
            disabled={disabled}
            hitSlop={4}
            accessibilityLabel={`${accessibilityPrefix} ${option.label}`}
            accessibilityState={{selected: on}}
            style={[
              styles.segment,
              {borderColor: on ? COLORS.accent : borderColor},
              on && styles.segmentOn,
            ]}>
            <Text
              style={[
                styles.segmentText,
                {color: on ? COLORS.accentText : textColor},
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: FONT.medium, fontWeight: '600', marginBottom: 10},
  subtitle: {
    fontSize: FONT.medium,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  label: {fontSize: FONT.small, width: 110},
  segments: {flexDirection: 'row', flexWrap: 'wrap'},
  segment: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  segmentOn: {backgroundColor: COLORS.accent},
  segmentText: {fontSize: FONT.small, fontWeight: '600'},
  hint: {fontSize: FONT.small, opacity: 0.7, marginLeft: 4},
});

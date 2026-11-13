/**
 * The abbreviation on a Project's or Area's ⚙ Settings
 * (docs/dev/history/technical-design-calmer-screens.md §3.8): the `#tag` pill,
 * tap to edit. A save re-validates against every other item's abbreviation
 * (domain/abbrev.ts) and writes the frontmatter fresh from the cache, so a
 * field another block on the page wrote meanwhile is kept.
 */
import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  abbrevErrorMessage,
  ExistingAbbrev,
  validateAbbrev,
} from '../../domain/abbrev';
import {
  findCachedItem,
  frontMatterOf,
  getCachedData,
  updateItemFrontMatter,
} from '../../storage/dataCache';
import {saveFrontMatter} from '../../storage/projectFile';
import ClipboardTextInput from '../../ui/ClipboardTextInput';
import {useErrorStatus} from '../../ui/status/StatusProvider';
import MarkWrap from '../../ui/status/StatusMark';
import {FONT} from '../../ui/theme';
import {errorMessage} from '../../utils/errorMessage';
import {logError} from '../../utils/log';

interface Props {
  kind: 'project' | 'area';
  path: string;
  abbrev: string | null;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function AbbrevEditor({
  kind,
  path,
  abbrev,
  textColor,
  borderColor,
  placeholderColor,
}: Props): React.JSX.Element {
  /** Every OTHER Project/Area's abbreviation, from the cache - taken fresh each time editing starts. */
  const listOtherAbbrevs = useCallback((): ExistingAbbrev[] => {
    const cache = getCachedData();
    if (!cache) return [];
    return cache.items
      .filter(i => i.path !== path && i.abbrev !== null)
      .map(i => ({value: i.abbrev as string, itemName: i.name}));
  }, [path]);

  /** Re-validates (the pill already disables Save while invalid) and throws a message the pill shows. */
  const save = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const validation = validateAbbrev(trimmed, listOtherAbbrevs());
      if (!validation.valid) throw new Error(abbrevErrorMessage(validation));
      const current = findCachedItem(path);
      if (!current) throw new Error('This item is not loaded yet.');
      const fm = {...frontMatterOf(current), abbrev: trimmed};
      const nextRaw = await saveFrontMatter(kind, path, current.rawContent, fm);
      updateItemFrontMatter(path, nextRaw, fm);
    },
    [kind, path, listOtherAbbrevs],
  );

  return (
    <AbbrevPill
      abbrev={abbrev}
      getExistingAbbrevs={listOtherAbbrevs}
      onSave={save}
      textColor={textColor}
      borderColor={borderColor}
      placeholderColor={placeholderColor}
    />
  );
}

/**
 * The `#tag` pill (docs/dev/history/technical-design-project-area-
 * abbreviations.md). Tap to edit inline,
 * mirroring ui/ItemContextRows.tsx's ItemScopeRow tap-to-edit pattern (draft
 * state + Save/Cancel text buttons). Always rendered once
 * the item has loaded - migrateMissingAbbrevs
 * (storage/dataCache.ts) guarantees every Project/Area already has a
 * non-null abbrev by the time this screen can show one, so there's no
 * "+ Add" empty state the way Scope/Goal have; a still-null value (should
 * not happen post-migration) just shows an empty "#" pill, itself tappable
 * to fill one in.
 *
 * Validates live against the same two rules the storage-side save enforces
 * (domain/abbrev.ts's validateAbbrev) - reserved flow-state word, or already
 * used by another Project/Area, case-insensitively. `getExistingAbbrevs` is
 * a thunk rather than a plain prop so the snapshot is taken fresh each time
 * editing starts (startEdit), rather than risking a mount-time list going
 * stale as other items change while this screen sits open.
 *
 * One conditional error line: no permanently-visible hint line, and no
 * separate dimmed reserved-word line. A single `common.error`-styled line
 * (undimmed - see ui/commonStyles.ts) appears only while the current draft
 * is actually invalid, covering the reserved-word and duplicate cases.
 */
function AbbrevPill({
  abbrev,
  getExistingAbbrevs,
  onSave,
  textColor,
  borderColor,
  placeholderColor,
}: {
  abbrev: string | null;
  getExistingAbbrevs: () => ExistingAbbrev[];
  onSave: (text: string) => Promise<void>;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(abbrev ?? '');
  const [existingAbbrevs, setExistingAbbrevs] = useState<ExistingAbbrev[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = () => {
    setSaveError(null);
    setDraft(abbrev ?? '');
    setExistingAbbrevs(getExistingAbbrevs());
    setEditing(true);
  };
  const cancelEdit = () => {
    setSaveError(null);
    setDraft(abbrev ?? '');
    setEditing(false);
  };

  const validation = validateAbbrev(draft, existingAbbrevs);
  // Only reserved/duplicate ever show while editing an already-populated
  // pill - 'empty' would require clearing a non-empty draft to nothing,
  // which just disables Save below rather than showing text for it.
  const liveError = !validation.valid ? abbrevErrorMessage(validation) : null;

  const save = () => {
    if (!validation.valid) return;
    setSaveError(null);
    setSaving(true);
    onSave(draft)
      .then(() => setEditing(false))
      .catch(e => {
        logError('AbbrevPill: save failed', errorMessage(e));
        setSaveError(errorMessage(e));
      })
      .finally(() => setSaving(false));
  };

  // Validation (live) or save error -> central status slot, ⚠ on the field
  // (docs/dev/history/technical-design-status-slot.md §7.4).
  const shownError = editing ? liveError ?? saveError : null;
  useErrorStatus(
    'ItemSettings.abbrev',
    shownError,
    !liveError && saveError ? () => setSaveError(null) : undefined,
  );

  if (editing) {
    return (
      <View style={styles.abbrevEditWrap}>
        <View style={styles.abbrevEditRow}>
          <MarkWrap mark={shownError ? 'warning' : null} textColor={textColor}>
            <View style={styles.abbrevInputBox}>
              <ClipboardTextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={save}
                placeholder="Abbrev"
                placeholderColor={placeholderColor}
                textColor={textColor}
                borderColor={borderColor}
                editable={!saving}
              />
            </View>
          </MarkWrap>
          <Pressable
            onPress={save}
            disabled={saving || !validation.valid}
            hitSlop={8}
            style={[styles.abbrevSaveButton, {borderColor}]}>
            <Text style={[styles.abbrevSaveText, {color: textColor}]}>
              Save
            </Text>
          </Pressable>
          <Pressable onPress={cancelEdit} disabled={saving} hitSlop={8}>
            <Text style={[styles.abbrevCancelText, {color: textColor}]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={startEdit}
      hitSlop={8}
      style={[styles.abbrevPill, {borderColor: textColor}]}>
      <Text style={[styles.abbrevPillText, {color: textColor}]}>
        #{abbrev ?? ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  abbrevPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  abbrevPillText: {
    fontSize: FONT.small,
    fontWeight: '600',
  },
  abbrevEditWrap: {},
  abbrevEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // ClipboardTextInput's own wrap is `flex: 1`; inline next to Save/Cancel it needs a width: short, abbreviations are a few characters.
  abbrevInputBox: {
    width: 90,
  },
  abbrevSaveButton: {
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 6,
  },
  abbrevSaveText: {
    fontSize: FONT.small,
  },
  abbrevCancelText: {
    fontSize: FONT.small,
    opacity: 0.6,
    marginLeft: 8,
    paddingHorizontal: 4,
  },
});

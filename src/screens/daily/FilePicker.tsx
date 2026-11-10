/**
 * More… on the Inbox card (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): every Active project and area in the list's place, the card staying
 * in the box above. Projects | Areas, paged, each with its abbreviation (and
 * a project's area in grey). A tap files the item there. Below:
 * + New project from this item and Someday / Maybe; ‹ Back to the card.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FileToItem} from '../../domain/captureFileTo';
import MiniTabs, {MiniTabDef} from '../../ui/MiniTabs';
import {MEETING_ROW_HEIGHT} from '../../ui/MeetingRow';
import PagedSection from '../../ui/PagedSection';
import PillButton from '../../ui/PillButton';
import {FONT} from '../../ui/theme';

export interface PickerPlace extends FileToItem {
  /** A project's area, by name. */
  area: string | null;
}

type Kind = 'project' | 'area';
const TABS: MiniTabDef<Kind>[] = [
  {key: 'project', label: 'Projects'},
  {key: 'area', label: 'Areas'},
];
const ROW_PX = MEETING_ROW_HEIGHT.oneLine;

interface Props {
  places: readonly PickerPlace[];
  onPick: (place: PickerPlace) => void;
  onBack: () => void;
  /** Only for a todo. */
  onNewProject?: () => void;
  onSomeday?: () => void;
  textColor: string;
  borderColor: string;
}

export default function FilePicker({places, onPick, onBack, onNewProject, onSomeday, textColor, borderColor}: Props): React.JSX.Element {
  const [kind, setKind] = useState<Kind>('project');
  const rows = places.filter(p => p.kind === kind && p.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
        <Text style={[styles.backText, {color: textColor}]}>‹ Back to the card</Text>
      </Pressable>
      <MiniTabs tabs={TABS} activeKey={kind} onChange={setKind} textColor={textColor} borderColor={borderColor} />
      <PagedSection<PickerPlace>
        header=""
        rows={rows}
        rowHeight={() => ROW_PX}
        heightKey="inbox:picker"
        resetKey={kind}
        renderRow={place => (
          <Pressable
            key={place.path}
            onPress={() => onPick(place)}
            accessibilityRole="button"
            accessibilityLabel={`File to ${place.name}`}
            style={[styles.row, {borderBottomColor: borderColor}]}>
            <Text style={[styles.name, {color: textColor}]} numberOfLines={1}>
              {place.name}
              {place.abbrev ? <Text style={styles.abbrev}>{`  #${place.abbrev.toUpperCase()}`}</Text> : null}
            </Text>
            {place.area ? (
              <Text style={[styles.area, {color: textColor}]} numberOfLines={1}>
                {place.area}
              </Text>
            ) : null}
          </Pressable>
        )}
        emptyHint={kind === 'project' ? 'No active projects.' : 'No active areas.'}
        textColor={textColor}
        borderColor={borderColor}
      />
      <View style={styles.bottom}>
        {onNewProject ? <PillButton label="+ New project from this item" onPress={onNewProject} textColor={textColor} borderColor={borderColor} /> : null}
        {onSomeday ? <PillButton label="Someday / Maybe" onPress={onSomeday} textColor={textColor} borderColor={borderColor} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  back: {paddingVertical: 6},
  backText: {fontSize: FONT.small, fontWeight: '700'},
  row: {height: ROW_PX, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1},
  name: {flex: 1, fontSize: FONT.medium, includeFontPadding: false},
  abbrev: {fontWeight: '700'},
  // Secondary, not a meaning.
  area: {fontSize: FONT.small, opacity: 0.6, marginLeft: 8, maxWidth: '40%', includeFontPadding: false},
  bottom: {flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8},
});

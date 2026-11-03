/**
 * The setup assistant's Welcome back screen (docs/dev/history/technical-design-fresh-start-profile.md
 * §3.3): shown before the five steps when Kept runs on fresh settings and finds saved profiles.
 * One radio row per profile (newest first and selected, paged five at a time), Load "<name>" and
 * Start fresh. Not counted in the steps. Loading is the caller's (the normal profile switch).
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {formatDate} from '../../domain/dateFormat';
import {todayIso} from '../../domain/meetingTime';
import {ProfileInfo} from '../../storage/profiles';
import {requestHelp} from '../../ui/helpStore';
import PagedSection from '../../ui/PagedSection';
import PillButton from '../../ui/PillButton';
import {FONT, SPACING} from '../../ui/theme';
import {requestEinkRefresh} from '../../utils/screenRefresh';

const ROW_HEIGHT = 56;
const ROWS_PER_PAGE = 5;

interface Props {
  /** Readable saved profiles, newest first (storage/profiles.ts's listSavedProfiles); at least one. */
  profiles: ProfileInfo[];
  onLoad: (profile: ProfileInfo) => void;
  onStartFresh: () => void;
  busy: boolean;
  textColor: string;
  borderColor: string;
}

/** "saved 3.11." - the local date of `savedAt`, without the time. */
function savedText(savedAt: string | null): string {
  if (!savedAt) return '';
  const date = new Date(savedAt);
  return Number.isNaN(date.getTime()) ? '' : `saved ${formatDate(todayIso(date), todayIso())}`;
}

export default function WelcomeBack({profiles, onLoad, onStartFresh, busy, textColor, borderColor}: Props): React.JSX.Element {
  const [selectedId, setSelectedId] = useState(profiles[0].id);
  const selected = profiles.find(p => p.id === selectedId) ?? profiles[0];
  const pill = {textColor, borderColor};
  const select = (id: string) => {
    setSelectedId(id);
    requestEinkRefresh();
  };
  return (
    <View style={styles.container}>
      <View style={[styles.header, {borderColor}]}>
        <Text style={[styles.title, {color: textColor}]}>Welcome back</Text>
        <PillButton label="? Help" onPress={() => requestHelp('profiles-and-demo', 'saved-profiles')} {...pill} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.text, {color: textColor}]}>
          Kept found settings you saved earlier. Load them to continue where you left off - your folders, Note setups
          and contexts. Your notes and files are not changed.
        </Text>
        <PagedSection<ProfileInfo>
          header="Saved profiles"
          rows={profiles}
          rowHeight={() => ROW_HEIGHT}
          viewportHeight={ROW_HEIGHT * Math.min(profiles.length, ROWS_PER_PAGE)}
          renderRow={p => (
            <Pressable
              key={p.id}
              onPress={() => select(p.id)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{checked: p.id === selected.id}}
              style={[styles.row, {borderColor}]}>
              <Text style={[styles.rowName, {color: textColor}, p.id === selected.id && styles.bold]} numberOfLines={1}>
                {p.id === selected.id ? '● ' : '○ '}
                {p.name}
              </Text>
              <Text style={[styles.rowMeta, {color: textColor}]} numberOfLines={1}>
                {savedText(p.savedAt)}
              </Text>
            </Pressable>
          )}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
      <View style={styles.footer}>
        <Text style={[styles.hint, {color: textColor}]}>Load later: Settings → Data → Profiles → Restore</Text>
        <View style={styles.buttons}>
          <PillButton label="Start fresh" size="large" onPress={onStartFresh} disabled={busy} {...pill} />
          <PillButton label={`Load "${selected.name}"`} size="large" primary onPress={() => onLoad(selected)} disabled={busy} {...pill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: SPACING.sm, marginBottom: SPACING.md},
  title: {fontSize: FONT.medium, fontWeight: '700'},
  body: {maxWidth: 640},
  text: {fontSize: FONT.medium, marginBottom: SPACING.md},
  row: {height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1},
  rowName: {flex: 1, fontSize: FONT.medium},
  rowMeta: {fontSize: FONT.small, opacity: 0.6, marginLeft: SPACING.sm},
  bold: {fontWeight: '700'},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
  buttons: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  footer: {marginTop: SPACING.lg, gap: SPACING.sm},
});

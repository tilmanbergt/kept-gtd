/**
 * Settings → Advanced (docs/dev/history/technical-design-about-debug-experimental.md §3.6):
 * Profiles and the tools (Reload all files, Integrity Check, Touch test, Keep
 * tabs in memory, Performance tracing); the Experimental switches live on
 * Settings → Features. Presentational: Settings.tsx owns the values and the
 * handlers, every switch saves immediately.
 */
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {FONT, SPACING} from '../../ui/theme';
import ProfilesSection from './ProfilesSection';
import SettingSwitch from './SettingSwitch';

interface Props {
  activeProfileId: string;
  onSwitchProfile?: (id: string) => Promise<void>;
  perfTracing: boolean;
  keepTabsAlive: boolean;
  integrityCheckRunning: boolean;
  reloading: boolean;
  onReloadAllFiles: () => void;
  onTogglePerfTracing: () => void;
  onToggleKeepTabsAlive: () => void;
  onRunIntegrityCheck: () => void;
  onOpenTouchTest: () => void;
  textColor: string;
  borderColor: string;
}

export default function AdvancedTab(p: Props): React.JSX.Element {
  const {textColor, borderColor} = p;
  return (
    <View style={styles.row}>
      <View style={[styles.column, styles.columnLeft]}>
        <ProfilesSection
          activeProfileId={p.activeProfileId}
          onSwitchProfile={p.onSwitchProfile}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <View style={styles.column}>
        <Text style={[styles.heading, {color: textColor}]}>Tools</Text>
        <View style={styles.field}>
          <Pressable onPress={p.onReloadAllFiles} disabled={p.reloading} hitSlop={8} style={styles.button}>
            <Text style={[styles.buttonText, {color: textColor}]}>Reload all files</Text>
          </Pressable>
          {p.reloading && <ActivityIndicator style={styles.spinner} />}
          <Text style={[styles.hint, {color: textColor}]}>
            Reads all projects, areas and the Inbox again. Opening Kept GTD already reads files changed outside it (on
            your computer, in Obsidian); use this when a change still doesn't show up.
          </Text>
        </View>
        <View style={styles.field}>
          <Pressable onPress={p.onRunIntegrityCheck} disabled={p.integrityCheckRunning} hitSlop={8} style={styles.button}>
            <Text style={[styles.buttonText, {color: textColor}]}>Run Integrity Check</Text>
          </Pressable>
          {p.integrityCheckRunning && <ActivityIndicator style={styles.spinner} />}
          <Text style={[styles.hint, {color: textColor}]}>
            Scans every Project/Area/Archive/Inbox for broken note links and note names that break Obsidian links, and writes a report to EXPORT/kept-gtd/debug.
          </Text>
        </View>
        <View style={styles.field}>
          <Pressable onPress={p.onOpenTouchTest} hitSlop={8} style={styles.button}>
            <Text style={[styles.buttonText, {color: textColor}]}>Touch test</Text>
          </Pressable>
          <Text style={[styles.hint, {color: textColor}]}>
            Finds out why a tap doesn't register: tap sample rows with finger or pen and see which taps arrive and what they hit. Changes nothing.
          </Text>
        </View>
        <SettingSwitch
          label="Keep tabs in memory"
          on={p.keepTabsAlive}
          onPress={p.onToggleKeepTabsAlive}
          hint="Daily, Week, Month, Current, Projects and Areas stay loaded after their first visit, so switching back is fast. Turn off if something looks wrong."
          textColor={textColor}
        />
        <SettingSwitch
          label="Performance tracing"
          on={p.perfTracing}
          onPress={p.onTogglePerfTracing}
          hint="Records how long each tab switch, reopen and cold start takes and writes one small file per event to EXPORT/kept-gtd/debug/perf."
          textColor={textColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flex: 1},
  column: {flex: 1},
  columnLeft: {marginRight: SPACING.base},
  divider: {width: 1, marginRight: SPACING.base},
  heading: {fontSize: FONT.medium, fontWeight: '700', marginBottom: SPACING.sm},
  field: {marginBottom: 18},
  button: {alignSelf: 'flex-start'},
  buttonText: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
  spinner: {marginTop: SPACING.sm, alignSelf: 'flex-start'},
});

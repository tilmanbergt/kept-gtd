/**
 * Settings → Advanced (docs/dev/history/technical-design-settings-tabs.md T5): left, Reporting a
 * problem (Debug logging, Export debug bundle); right, the tools (Reload all files, Integrity
 * Check, Keep tabs in memory, Performance tracing; while Debug logging is on also Check screen and
 * pages, docs/dev/history/technical-design-launch-ready.md §6). Settings.tsx owns the values and the
 * handlers; every switch saves immediately.
 */
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {FONT, SPACING} from '../../ui/theme';
import ReportingSection from './ReportingSection';
import SettingSwitch from './SettingSwitch';

interface Props {
  debugLogging: boolean;
  onToggleDebugLogging: () => void;
  perfTracing: boolean;
  keepTabsAlive: boolean;
  integrityCheckRunning: boolean;
  reloading: boolean;
  onReloadAllFiles: () => void;
  onTogglePerfTracing: () => void;
  onToggleKeepTabsAlive: () => void;
  onRunIntegrityCheck: () => void;
  onOpenScreenCheck: () => void;
  textColor: string;
  borderColor: string;
}

export default function AdvancedTab(p: Props): React.JSX.Element {
  const {textColor, borderColor} = p;
  return (
    <View style={styles.row}>
      <View style={[styles.column, styles.columnLeft]}>
        <ReportingSection debugLogging={p.debugLogging} onToggleDebugLogging={p.onToggleDebugLogging} textColor={textColor} borderColor={borderColor} />
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
        {p.debugLogging && (
          <View style={styles.field}>
            <Pressable onPress={p.onOpenScreenCheck} hitSlop={8} style={styles.button}>
              <Text style={[styles.buttonText, {color: textColor}]}>Check screen and pages</Text>
            </Pressable>
            <Text style={[styles.hint, {color: textColor}]}>
              Shows the screen size and the page size of the note Kept was opened from, and tries a horizontal test note in EXPORT/kept-gtd/debug. For bug reports about other devices and landscape.
            </Text>
          </View>
        )}
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

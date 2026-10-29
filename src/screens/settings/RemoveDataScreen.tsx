/**
 * Settings → Data → Remove Kept's data (docs/dev/history/technical-design-remove-data.md):
 * drawn in place of the settings. First everything Kept has put on the device, each kind with
 * where it is, how much, and a checkbox (R2, R3); then one question in the status line (R5);
 * then one line per step (R6). When the settings went, Kept is as on a first install: Start
 * fresh (the setup assistant opens) or Close Kept (then uninstall it) - R7.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {
  countText,
  initialChoices,
  listedKinds,
  outcomeText,
  planRemoval,
  RemovalChoices,
  removalQuestion,
  rowHint,
  saveProfileOffered,
  StepOutcome,
  toggleChoice,
} from '../../domain/dataRemoval';
import {RemovalScan, runRemoval, scanRemoval} from '../../storage/dataRemoval';
import PillButton from '../../ui/PillButton';
import {useStatus} from '../../ui/status/StatusProvider';
import {FONT, SPACING, useThemeColors} from '../../ui/theme';
import {useStatusConfirm} from '../../ui/useStatusConfirm';
import {errorMessage} from '../../utils/errorMessage';
import {logError} from '../../utils/log';
import {requestEinkRefresh} from '../../utils/screenRefresh';
import CheckToggle from './CheckToggle';

/** Listed at the bottom: what this screen never touches, and why (§3). */
const STAYS = [
  'Notes Kept created - they hold your handwriting. Delete them in the file manager if you want.',
  "Kept's mark icons, keywords and headings inside your notes - they are part of the notes.",
  'Empty folders Kept created, and archive PDFs - yours to keep or delete.',
  'Runtime permissions - the Supernote resets them when you uninstall.',
];

interface Props {
  /** Back to the settings (nothing removed, or the settings kept). */
  onClose: () => void;
  /** Kept starts again as on a first install (App remounts; the setup assistant opens). */
  onRestartFresh: () => void;
}

export default function RemoveDataScreen({onClose, onRestartFresh}: Props): React.JSX.Element {
  const {textColor, borderColor} = useThemeColors();
  const [scan, setScan] = useState<RemovalScan | null>(null);
  const [choices, setChoices] = useState<RemovalChoices | null>(null);
  const [saveFirst, setSaveFirst] = useState(true);
  const [running, setRunning] = useState(false);
  const [outcomes, setOutcomes] = useState<StepOutcome[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useStatusConfirm('RemoveData.confirm');
  useStatus('RemoveData.error', error ? {kind: 'error', text: error, onDismiss: () => setError(null)} : null);

  const load = useCallback(async () => {
    try {
      const next = await scanRemoval();
      setScan(next);
      setChoices(initialChoices(next.inventory));
    } catch (e) {
      logError('RemoveData: scan failed', errorMessage(e));
      setError(`Looking for Kept's data failed: ${errorMessage(e)}`);
    }
    requestEinkRefresh();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!scan || !choices) return;
    const plan = planRemoval(choices, saveFirst);
    if (plan.length === 0 || !(await confirm({text: removalQuestion(choices), detail: removalQuestion(choices), actionLabel: 'Remove'}))) return;
    setRunning(true);
    setOutcomes([]);
    try {
      await runRemoval(plan, scan.targets, 'Allow Kept GTD to delete its own data you chose to remove: logs, demo space and the files you checked.', outcome =>
        setOutcomes(prev => [...(prev ?? []), outcome]),
      );
    } catch (e) {
      logError('RemoveData: removal failed', errorMessage(e));
      setError(`Removing failed: ${errorMessage(e)}`);
    } finally {
      setRunning(false);
      requestEinkRefresh();
    }
  };

  const text = {color: textColor};
  if (outcomes) {
    const settingsGone = outcomes.some(o => o.step === 'settings' && !o.error && !o.skipped);
    return (
      <View style={styles.container}>
        <Text style={[styles.heading, text]}>{running ? 'Removing…' : 'Removed'}</Text>
        {outcomes.map(o => (
          <Text key={o.step} style={[styles.line, text]}>
            {outcomeText(o)}
          </Text>
        ))}
        {running && <ActivityIndicator style={styles.spinner} />}
        {!running && (
          <>
            <Text style={[styles.hint, text]}>
              {settingsGone
                ? 'Kept is now as on a first install. Start fresh opens the setup assistant; Close Kept closes it - to uninstall, remove the plugin in the Supernote\'s settings.'
                : 'Your settings are kept.'}
            </Text>
            <View style={styles.controls}>
              {settingsGone ? (
                <>
                  <PillButton label="Start fresh" primary onPress={onRestartFresh} textColor={textColor} borderColor={borderColor} />
                  <PillButton
                    label="Close Kept"
                    onPress={() => {
                      onRestartFresh();
                      PluginManager.closePluginView().catch(e => logError('RemoveData: closePluginView failed', errorMessage(e)));
                    }}
                    textColor={textColor}
                    borderColor={borderColor}
                  />
                </>
              ) : (
                <PillButton label="Done" primary onPress={onClose} textColor={textColor} borderColor={borderColor} />
              )}
            </View>
          </>
        )}
      </View>
    );
  }

  if (!scan || !choices) {
    return (
      <View style={styles.container}>
        <Text style={[styles.heading, text]}>Remove Kept's data</Text>
        {error ? <PillButton label="Back" onPress={onClose} textColor={textColor} borderColor={borderColor} /> : <ActivityIndicator style={styles.spinner} />}
      </View>
    );
  }

  const {inventory} = scan;
  const nothingChecked = planRemoval(choices, false).length === 0;
  return (
    <View style={[styles.container, styles.row]}>
      <View style={[styles.column, styles.columnLeft]}>
        <Text style={[styles.heading, text]}>Remove Kept's data</Text>
        <Text style={[styles.intro, text]}>Everything Kept has put on this device. Check what to remove.</Text>
        {listedKinds(inventory).map(k => {
          const count = inventory.counts[k.kind];
          const hint = rowHint(k.kind, choices, inventory);
          return (
            <View key={k.kind} style={[styles.kind, count === 0 && styles.empty]}>
              <CheckToggle
                label={`${k.label} · ${countText(k.kind, count)}`}
                checked={choices[k.kind]}
                onPress={() => setChoices(c => (c ? toggleChoice(c, k.kind, inventory) : c))}
                textColor={textColor}
              />
              <Text style={[styles.where, text]}>{k.where}</Text>
              {hint && count > 0 && <Text style={[styles.warn, text]}>{hint}</Text>}
            </View>
          );
        })}
      </View>
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <View style={styles.column}>
        {saveProfileOffered(choices) && (
          <View style={styles.kind}>
            <CheckToggle label="Save the active profile first" checked={saveFirst} onPress={() => setSaveFirst(v => !v)} textColor={textColor} />
            <Text style={[styles.where, text]}>So your setup can come back from EXPORT/kept-gtd/profiles. The Gmail app password and the calendar link are never in profile files - write them down.</Text>
          </View>
        )}
        <View style={styles.controls}>
          <PillButton label="Remove…" primary disabled={nothingChecked} onPress={remove} textColor={textColor} borderColor={borderColor} />
          <PillButton label="Cancel" onPress={onClose} textColor={textColor} borderColor={borderColor} />
        </View>
        <Text style={[styles.subheading, text]}>Stays on your device</Text>
        {STAYS.map(line => (
          <Text key={line} style={[styles.where, text]}>
            • {line}
          </Text>
        ))}
        <Pressable onPress={load} hitSlop={8} style={styles.link}>
          <Text style={[styles.linkText, text]}>Look again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: SPACING.base},
  row: {flexDirection: 'row'},
  column: {flex: 1},
  columnLeft: {marginRight: SPACING.base},
  divider: {width: 1, marginRight: SPACING.base},
  heading: {fontSize: FONT.medium, fontWeight: '700', marginBottom: SPACING.sm},
  subheading: {fontSize: FONT.small, fontWeight: '700', marginTop: SPACING.base, marginBottom: SPACING.xs},
  intro: {fontSize: FONT.small, opacity: 0.7, marginBottom: SPACING.sm},
  kind: {marginBottom: SPACING.sm},
  empty: {opacity: 0.5},
  where: {fontSize: FONT.small, opacity: 0.6, marginLeft: 28},
  warn: {fontSize: FONT.small, fontWeight: '600', marginLeft: 28, marginTop: 2},
  line: {fontSize: FONT.small, marginBottom: 4},
  hint: {fontSize: FONT.small, opacity: 0.7, marginTop: SPACING.base},
  controls: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.sm},
  spinner: {marginTop: SPACING.base, alignSelf: 'flex-start'},
  link: {marginTop: SPACING.base, alignSelf: 'flex-start'},
  linkText: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
});

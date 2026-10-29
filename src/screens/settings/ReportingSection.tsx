/**
 * Settings → Advanced → Reporting a problem (docs/dev/history/technical-design-settings-tabs.md
 * T5): the Debug logging switch and Export debug bundle, which About only points to.
 */
import React, {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {exportDebugBundle} from '../../storage/debugBundle';
import {loadSettings} from '../../storage/settingsStorage';
import {DEBUG_LOG_FOLDER_PATH, displayPath} from '../../supernote/devicePaths';
import PillButton from '../../ui/PillButton';
import {useStatus} from '../../ui/status/StatusProvider';
import {FONT, SPACING} from '../../ui/theme';
import {errorMessage} from '../../utils/errorMessage';
import {logError} from '../../utils/log';
import {LOG_FILE_NAME} from '../../utils/logSink';

interface Props {
  debugLogging: boolean;
  onToggleDebugLogging: () => void;
  textColor: string;
  borderColor: string;
}

export default function ReportingSection({debugLogging, onToggleDebugLogging, textColor, borderColor}: Props): React.JSX.Element {
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{kind: 'success' | 'error'; text: string} | null>(null);
  useStatus('Settings.reporting.export', result ? {...result, onDismiss: () => setResult(null)} : null);
  const folder = displayPath(DEBUG_LOG_FOLDER_PATH);

  const handleExport = async () => {
    setResult(null);
    setExporting(true);
    try {
      const path = await exportDebugBundle(await loadSettings());
      setResult({kind: 'success', text: `Saved ${folder}/${path.slice(path.lastIndexOf('/') + 1)} - check it before sharing.`});
    } catch (e) {
      const message = errorMessage(e);
      logError('ReportingSection: export debug bundle failed', message);
      setResult({kind: 'error', text: `Export failed: ${message}`});
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Text style={[styles.heading, {color: textColor}]}>Reporting a problem</Text>
      <Text style={[styles.intro, {color: textColor}]}>Turn on Debug logging, make the problem happen again, then export the bundle and attach it to a GitHub issue.</Text>
      <View style={styles.field}>
        <Pressable onPress={onToggleDebugLogging} hitSlop={8} style={styles.button}>
          <Text style={[styles.buttonText, {color: textColor}]}>Debug logging: {debugLogging ? 'ON (tap to turn off)' : 'OFF (tap to turn on)'}</Text>
        </Pressable>
        <Text style={[styles.hint, {color: textColor}]}>
          Also writes every log line to {folder}/{LOG_FILE_NAME}, so it survives a crash.
        </Text>
      </View>
      <View style={styles.field}>
        <View style={styles.inline}>
          <PillButton label="Export debug bundle" primary disabled={exporting} onPress={handleExport} textColor={textColor} borderColor={borderColor} />
          {exporting && <ActivityIndicator style={styles.spinner} />}
        </View>
        <Text style={[styles.hint, {color: textColor}]}>
          Saves one text file with version, device, a settings summary (no names), counts and the recent log to {folder}. Passwords, calendar links and
          e-mail addresses are removed; file paths stay, so please look through it before attaching it to a GitHub issue.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heading: {fontSize: FONT.medium, fontWeight: '700', marginBottom: SPACING.sm},
  intro: {fontSize: FONT.small, opacity: 0.7, marginBottom: SPACING.base},
  field: {marginBottom: 18},
  inline: {flexDirection: 'row', alignItems: 'center'},
  button: {alignSelf: 'flex-start'},
  buttonText: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
  spinner: {marginLeft: SPACING.sm},
});

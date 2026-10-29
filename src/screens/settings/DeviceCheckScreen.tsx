/**
 * Settings → Advanced → Check device files (docs/dev/history/technical-design-easy-start.md
 * §7): shows what storage/deviceCheck.ts found - each listing with its
 * top-level folder names, the file Kept was opened from and the current page -
 * as text to photograph, plus Open buttons for the questions only a person
 * can answer (does the file open, on which page). Drawn in place of the
 * settings, like the Touch test. Only reads; an Open hands the file to the host.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {DeviceCheckListing, DeviceCheckResult, runDeviceCheck} from '../../storage/deviceCheck';
import {openPath} from '../../supernote/fileSystem';
import PillButton from '../../ui/PillButton';
import {useStatus} from '../../ui/status/StatusProvider';
import {FONT, SPACING, useThemeColors} from '../../ui/theme';
import {errorMessage} from '../../utils/errorMessage';
import {logError} from '../../utils/log';
import {requestEinkRefresh} from '../../utils/screenRefresh';

type Message = {kind: 'error' | 'info'; text: string};

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

function listingLine(l: DeviceCheckListing): string {
  if (!l.folders) return `${l.path}: listing failed - ${l.error ?? 'no reason given'}`;
  const names = l.folders.length > 0 ? ` - ${l.folders.join(', ')}` : '';
  return `${l.path}: ${l.folders.length} folders, ${l.files} files${names}`;
}

export default function DeviceCheckScreen({onClose}: {onClose: () => void}): React.JSX.Element {
  const {textColor, borderColor} = useThemeColors();
  const [result, setResult] = useState<DeviceCheckResult | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  useStatus('DeviceCheck.result', message ? {...message, onDismiss: () => setMessage(null)} : null);

  const run = useCallback(async () => {
    setResult(null);
    try {
      setResult(await runDeviceCheck());
    } catch (e) {
      const text = errorMessage(e);
      logError('DeviceCheck: check failed', text);
      setMessage({kind: 'error', text: `Check device files failed: ${text}`});
    }
    requestEinkRefresh();
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const open = async (path: string, page: number) => {
    try {
      await openPath(path, page);
    } catch (e) {
      setMessage({kind: 'error', text: `Open ${baseName(path)} (page ${page}) failed: ${errorMessage(e)}`});
    }
  };

  const pill = {textColor, borderColor};
  const text = [styles.line, {color: textColor}];
  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <PillButton label="Run again" onPress={run} {...pill} />
        <PillButton label="Close" onPress={onClose} {...pill} />
      </View>
      {!result ? (
        <Text style={text}>Checking…</Text>
      ) : (
        <>
          <Text style={[styles.heading, {color: textColor}]}>Folders (K1, K3)</Text>
          {result.listings.map(l => (
            <Text key={l.path} style={text}>
              {listingLine(l)}
            </Text>
          ))}
          <Text style={[styles.heading, {color: textColor}]}>Opened from (K4)</Text>
          <Text style={text}>{result.launchPath ? `${result.launchPath} · current page ${result.page ?? 'unreadable'} (as the SDK reports it)` : 'Home - no file open'}</Text>
          {result.launchPath && (
            <View style={styles.controls}>
              <PillButton label="Open this file (last page)" onPress={() => open(result.launchPath!, -1)} {...pill} />
              {result.page !== null && <PillButton label={`Open this file at page ${result.page}`} onPress={() => open(result.launchPath!, result.page!)} {...pill} />}
            </View>
          )}
          <Text style={[styles.heading, {color: textColor}]}>Files outside Note (K2, K5)</Text>
          {result.samples.length === 0 && <Text style={text}>No PDF, EPUB or note found outside Note.</Text>}
          {result.samples.map(s => (
            <View key={s.path} style={styles.sample}>
              <Text style={text}>{`${s.kind.toUpperCase()}: ${s.path}`}</Text>
              <View style={styles.controls}>
                <PillButton label="Open (last page)" onPress={() => open(s.path, -1)} {...pill} />
                <PillButton label="Open at page 1" onPress={() => open(s.path, 0)} {...pill} />
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: SPACING.base},
  controls: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm},
  heading: {fontSize: FONT.medium, fontWeight: '700', marginTop: SPACING.base, marginBottom: SPACING.sm},
  line: {fontSize: FONT.small, marginBottom: 4},
  sample: {marginBottom: SPACING.sm},
});

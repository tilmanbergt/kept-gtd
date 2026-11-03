/**
 * Settings → Advanced → Check screen and pages
 * (docs/dev/history/technical-design-launch-ready.md §6, K1-K5): the screen
 * size React Native reports (and whether it changes when the device turns),
 * the page size of the note Kept was opened from, and a horizontal test note
 * in Kept's debug folder to try pages and text boxes on. Shown as text to
 * photograph, drawn in place of the settings. Writes only into the test note.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Dimensions, LayoutChangeEvent, PixelRatio, StyleSheet, Text, View} from 'react-native';
import {formatClock} from '../../domain/dateFormat';
import {
  addTestPage,
  createLandscapeTestNote,
  LANDSCAPE_TEST_NOTE,
  machineName,
  PageInfo,
  readLaunchPageInfo,
  writeTestPieces,
} from '../../storage/screenPageCheck';
import {displayPath} from '../../supernote/devicePaths';
import {openPath} from '../../supernote/fileSystem';
import {getCurrentPageNum, getRememberedLaunchNotePath} from '../../supernote/hostContext';
import PillButton from '../../ui/PillButton';
import {useStatus} from '../../ui/status/StatusProvider';
import {FONT, SPACING, useThemeColors} from '../../ui/theme';
import {errorMessage} from '../../utils/errorMessage';
import {log, logError} from '../../utils/log';
import {requestEinkRefresh} from '../../utils/screenRefresh';

type Message = {kind: 'error' | 'info'; text: string};

/** When this module was loaded - with the settings, at Kept's start. A later time after turning the device means Kept was restarted. */
const LOADED_AT = new Date();

const size = (w: number, h: number) => `${Math.round(w)} × ${Math.round(h)}`;

export function pageInfoLine(info: PageInfo): string {
  const pages = info.pageCount === null ? '? pages' : `${info.pageCount} ${info.pageCount === 1 ? 'page' : 'pages'}`;
  const pageSize = info.size ? `page ${info.page + 1}: ${size(info.size.width, info.size.height)} px` : `page ${info.page + 1}: size unreadable`;
  const machine = `made on ${machineName(info.machineType)}`;
  return [pages, pageSize, machine].join(' · ') + (info.error ? ` (${info.error})` : '');
}

export default function ScreenCheckScreen({onClose}: {onClose: () => void}): React.JSX.Element {
  const {textColor, borderColor} = useThemeColors();
  const [box, setBox] = useState<{width: number; height: number} | null>(null);
  const [changes, setChanges] = useState(0);
  const [, setTick] = useState(0);
  const [launchPage, setLaunchPage] = useState<number | null>(null);
  const [launchInfo, setLaunchInfo] = useState<PageInfo | null | undefined>(undefined);
  const [testInfo, setTestInfo] = useState<PageInfo | null>(null);
  const [testLine, setTestLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  useStatus('ScreenCheck.result', message ? {...message, onDismiss: () => setMessage(null)} : null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setChanges(c => c + 1));
    return () => sub.remove();
  }, []);

  const readLaunch = useCallback(async () => {
    try {
      const page = await getCurrentPageNum();
      setLaunchPage(page);
      setLaunchInfo(await readLaunchPageInfo(page));
    } catch (e) {
      const text = errorMessage(e);
      logError('ScreenCheck: reading the launch note failed', text);
      setMessage({kind: 'error', text: `Reading the note Kept was opened from failed: ${text}`});
    }
    requestEinkRefresh();
  }, []);

  useEffect(() => {
    readLaunch();
  }, [readLaunch]);

  const refresh = () => {
    setTick(t => t + 1);
    readLaunch();
  };

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setBox(prev => (prev && prev.width === width && prev.height === height ? prev : {width, height}));
    log('ScreenCheck: layout', size(width, height));
  }, []);

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setMessage({kind: 'error', text: `${label} failed: ${errorMessage(e)}`});
    }
    setBusy(false);
    requestEinkRefresh();
  };

  const window = Dimensions.get('window');
  const screen = Dimensions.get('screen');
  const launchPath = getRememberedLaunchNotePath()?.path ?? null;
  const pill = {textColor, borderColor};
  const text = [styles.line, {color: textColor}];
  const heading = [styles.heading, {color: textColor}];

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.controls}>
        <PillButton label="Refresh" onPress={refresh} {...pill} />
        <PillButton label="Close" onPress={onClose} {...pill} />
      </View>

      <Text style={heading}>Screen (K1, K3)</Text>
      <Text style={text}>{`This screen: ${box ? size(box.width, box.height) : '…'} dp`}</Text>
      <Text style={text}>{`Window: ${size(window.width, window.height)} dp · screen: ${size(screen.width, screen.height)} dp`}</Text>
      <Text style={text}>{`Pixel ratio ${PixelRatio.get()} · font scale ${PixelRatio.getFontScale()}`}</Text>
      <Text style={text}>{`Size changes while this screen is open: ${changes}`}</Text>
      <Text style={text}>{`Kept started at ${formatClock(LOADED_AT)}`}</Text>

      <Text style={heading}>Opened from (K2)</Text>
      <Text style={text}>{launchPath ? `${displayPath(launchPath)} · current page ${launchPage === null ? 'unreadable' : launchPage + 1}` : 'Launch file unknown'}</Text>
      {launchInfo === undefined && <Text style={text}>Reading…</Text>}
      {launchInfo === null && launchPath && <Text style={text}>Not a note - page size is read for notes only.</Text>}
      {launchInfo && <Text style={text}>{pageInfoLine(launchInfo)}</Text>}

      <Text style={heading}>Horizontal test note (K2, K4, K5)</Text>
      <Text style={text}>{displayPath(LANDSCAPE_TEST_NOTE)}</Text>
      {testInfo && <Text style={text}>{pageInfoLine(testInfo)}</Text>}
      {testLine && <Text style={text}>{testLine}</Text>}
      <View style={styles.controls}>
        <PillButton
          label="Create horizontal test note"
          disabled={busy}
          onPress={() => run('Creating the test note', async () => setTestInfo(await createLandscapeTestNote()))}
          {...pill}
        />
        <PillButton label="Add a page" disabled={busy || !testInfo} onPress={() => run('Adding a page', async () => setTestInfo(await addTestPage()))} {...pill} />
        <PillButton
          label="Write test text boxes"
          disabled={busy || !testInfo}
          onPress={() =>
            run('Writing test text boxes', async () => {
              const page = await writeTestPieces();
              setTestLine(`Text boxes at y 100, 1300 and 1600 written on page ${page + 1}.`);
            })
          }
          {...pill}
        />
        <PillButton
          label="Open test note"
          disabled={busy || !testInfo}
          onPress={() => run('Opening the test note', () => openPath(LANDSCAPE_TEST_NOTE, Math.max(0, (testInfo?.pageCount ?? 1) - 1)))}
          {...pill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: SPACING.base},
  controls: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm},
  heading: {fontSize: FONT.medium, fontWeight: '700', marginTop: SPACING.base, marginBottom: SPACING.sm},
  line: {fontSize: FONT.small, marginBottom: 4},
});

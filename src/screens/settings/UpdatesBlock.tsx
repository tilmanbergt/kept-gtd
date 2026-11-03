/**
 * Settings → About → Updates (docs/dev/history/technical-design-in-app-updates.md §6.2): what the
 * last check found, Check now, Download when a newer release is known, the daily-check switch,
 * how to install and the disclaimer. The check and download live in storage/updates.ts; the
 * download's messages come from ui/useUpdateNotice.ts, the same as from the notice.
 */
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {formatDate} from '../../domain/dateFormat';
import {isoDate} from '../../domain/lifecycleDates';
import {UPDATE_DISCLAIMER, UPDATE_FOLDER, UpdateCheckMode, UpdateCheckResult, availableText, checkResultText} from '../../domain/updateCheck';
import {UpdateSnapshot, checkForUpdate, knownUpdate} from '../../storage/updates';
import PillButton from '../../ui/PillButton';
import {useStatus} from '../../ui/status/StatusProvider';
import {FONT, SPACING} from '../../ui/theme';
import {startDownload, useUpdateSnapshot} from '../../ui/useUpdateNotice';
import CheckToggle from './CheckToggle';

interface Props {
  updateCheck: UpdateCheckMode;
  onToggleUpdateCheck: () => void;
  textColor: string;
  borderColor: string;
}

/** The one line under the heading: what is going on, or what the last check found. */
export function updateStatusLine(s: UpdateSnapshot, now: Date = new Date()): string {
  if (s.busy === 'checking') return 'Checking GitHub…';
  if (s.busy === 'downloading') return 'Downloading…';
  const update = knownUpdate(s);
  if (update && s.downloaded?.version === update.version) return `Downloaded: ${s.downloaded.path}`;
  if (update) return availableText(update.version);
  if (s.lastError) return s.lastError;
  if (s.lastCheckAt !== null) return `Up to date · checked ${formatDate(isoDate(new Date(s.lastCheckAt)), isoDate(now))}`;
  return 'Not checked yet.';
}

export default function UpdatesBlock({updateCheck, onToggleUpdateCheck, textColor, borderColor}: Props): React.JSX.Element {
  const snap = useUpdateSnapshot();
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const update = knownUpdate(snap);

  useStatus(
    'about.updateCheck',
    result
      ? {
          kind: result.kind === 'upToDate' ? 'success' : result.kind === 'available' ? 'info' : 'error',
          text: checkResultText(result),
          onDismiss: () => setResult(null),
        }
      : null,
  );

  const checkNow = () => {
    setResult(null);
    checkForUpdate({silent: false}).then(setResult);
  };

  return (
    <View>
      <Text style={[styles.heading, {color: textColor}]}>Updates</Text>
      <Text style={[styles.line, {color: textColor}]}>{updateStatusLine(snap)}</Text>
      <View style={styles.buttons}>
        <PillButton label="Check now" onPress={checkNow} disabled={snap.busy !== null} textColor={textColor} borderColor={borderColor} />
        {update && (
          <PillButton label="Download" primary onPress={() => startDownload(update)} disabled={snap.busy !== null} textColor={textColor} borderColor={borderColor} />
        )}
      </View>
      <CheckToggle label="Check automatically once a day" checked={updateCheck === 'daily'} onPress={onToggleUpdateCheck} textColor={textColor} />
      <Text style={[styles.hint, {color: textColor}]}>
        Downloads go to {UPDATE_FOLDER}. To install: close Kept, then Settings → Plugins → Add plugin → choose the file. Your data stays where it is.
      </Text>
      <Text style={[styles.hint, {color: textColor}]}>{UPDATE_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {fontSize: FONT.medium, fontWeight: '700', marginBottom: SPACING.sm},
  line: {fontSize: FONT.small, marginBottom: SPACING.sm},
  buttons: {flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
});

/**
 * Settings → Data (docs/dev/history/technical-design-settings-tabs.md T2): setting up and
 * tearing down in one place. Left, the folder fields with their own Save and Reset to
 * defaults; right, Run setup assistant, the profiles and Remove Kept's data
 * (technical-design-remove-data.md R1). The actions on the right wait while the folder fields
 * have unsaved changes: the assistant would not keep them and a profile switch would drop them.
 *
 * Each column scrolls (ScrollColumn.tsx) where it is taller than the screen (a turned A5 X, a Nomad;
 * docs/dev/history/technical-design-launch-ready.md L6), so Save and Reset to defaults stay
 * reachable. On the A5 X in portrait both fit and nothing scrolls.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import PillButton from '../../ui/PillButton';
import {FONT, SPACING} from '../../ui/theme';
import {FolderFields} from './DraftTabs';
import ProfilesSection from './ProfilesSection';
import ScrollColumn from './ScrollColumn';
import {SettingsDraft} from './useSettingsDraft';

interface Props {
  draft: SettingsDraft;
  activeProfileId: string;
  onSwitchProfile?: (id: string) => Promise<void>;
  onRunSetup: () => void;
  onRemoveData: () => void;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function DataTab({draft, activeProfileId, onSwitchProfile, onRunSetup, onRemoveData, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  const locked = draft.unsaved('folders');
  return (
    <View style={styles.row}>
      <ScrollColumn left>
        <Text style={[styles.heading, {color: textColor}]}>Folders</Text>
        <FolderFields draft={draft} textColor={textColor} borderColor={borderColor} placeholderColor={placeholderColor} />
      </ScrollColumn>
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <ScrollColumn>
        {locked && <Text style={[styles.locked, {color: textColor}]}>Save or reset the folder fields first.</Text>}
        <View style={styles.field}>
          <PillButton label="Run setup assistant" onPress={onRunSetup} disabled={locked} textColor={textColor} borderColor={borderColor} />
          <Text style={[styles.hint, {color: textColor}]}>Folders, notes and features in four steps; shows what it creates before it does.</Text>
        </View>
        <ProfilesSection activeProfileId={activeProfileId} onSwitchProfile={onSwitchProfile} locked={locked} textColor={textColor} borderColor={borderColor} />
        <View style={styles.field}>
          <PillButton label="Remove Kept's data…" onPress={onRemoveData} disabled={locked} textColor={textColor} borderColor={borderColor} />
          <Text style={[styles.hint, {color: textColor}]}>
            Before you uninstall or stop using Kept: shows everything Kept has put on this device and removes what you check. Uninstalling alone keeps the settings and passwords.
          </Text>
        </View>
      </ScrollColumn>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flex: 1},
  divider: {width: 1, marginRight: SPACING.base},
  heading: {fontSize: FONT.medium, fontWeight: '700', marginBottom: SPACING.sm},
  field: {marginBottom: 18},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
  locked: {fontSize: FONT.small, fontWeight: '600', marginBottom: SPACING.sm},
});

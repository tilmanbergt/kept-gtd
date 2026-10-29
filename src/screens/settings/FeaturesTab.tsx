/**
 * Settings → Features (docs/dev/history/technical-design-daily-slim.md §3.6,
 * docs/dev/history/technical-design-time-and-place.md §3.6): the module
 * switches (Project close-out) and the Experimental integrations. Every switch
 * takes effect and is stored at once; Settings.tsx owns values and handlers.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FONT, SPACING} from '../../ui/theme';
import SettingSwitch from './SettingSwitch';

interface Props {
  closeOut: boolean;
  experimentalGoogleCalendar: boolean;
  experimentalGmail: boolean;
  notebookContentsEnabled: boolean;
  onToggleCloseOut: () => void;
  onToggleGoogleCalendar: () => void;
  onToggleGmail: () => void;
  onToggleNotebookContents: () => void;
  textColor: string;
  borderColor: string;
}

export default function FeaturesTab(p: Props): React.JSX.Element {
  const {textColor, borderColor} = p;
  return (
    <View style={styles.row}>
      <View style={[styles.column, styles.columnLeft]}>
        <Text style={[styles.heading, {color: textColor}]}>Features</Text>
        <SettingSwitch
          label="Project close-out"
          on={p.closeOut}
          onPress={p.onToggleCloseOut}
          hint="When a project is done: a checklist, where its outcomes go, an archive PDF. Off: Done projects are archived directly."
          textColor={textColor}
        />
      </View>
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <View style={styles.column}>
        <Text style={[styles.heading, {color: textColor}]}>Experimental</Text>
        <Text style={[styles.intro, {color: textColor}]}>
          These integrations depend on outside services and may be slow or stop working. Switching one off only hides it;
          your settings for it are kept.
        </Text>
        <SettingSwitch
          label="Google Calendar"
          on={p.experimentalGoogleCalendar}
          onPress={p.onToggleGoogleCalendar}
          hint="Shows your Google Calendar (via its private ICS link) in Daily, Week, Month, Inbox, Projects/Areas and Review, and adds the Calendar tab here in Settings."
          textColor={textColor}
        />
        <SettingSwitch
          label="Gmail"
          on={p.experimentalGmail}
          onPress={p.onToggleGmail}
          hint="Adds the Gmail inbox step to the Weekly Review (IMAP with an app password) and the Gmail tab here in Settings."
          textColor={textColor}
        />
        <SettingSwitch
          label="Notebook contents"
          on={p.notebookContentsEnabled}
          onPress={p.onToggleNotebookContents}
          hint="Lists the headings of a Project's or Area's home notebook on its Notebook tab. Turn off if they don't show right or reading them is slow."
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
  intro: {fontSize: FONT.small, opacity: 0.7, marginBottom: SPACING.base},
});

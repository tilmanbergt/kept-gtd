/**
 * Settings → Features (docs/dev/history/technical-design-daily-slim.md §3.6,
 * docs/dev/history/technical-design-settings-tabs.md T4): left, the module switch (Project
 * close-out) and the Experimental switches, each stored at once; right, the Google Calendar and
 * Gmail fields while their switch is on, each block with its own Save. Settings.tsx owns values
 * and handlers.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FONT, SPACING} from '../../ui/theme';
import {CalendarFields, GmailFields} from './DraftTabs';
import SettingSwitch from './SettingSwitch';
import {SettingsDraft} from './useSettingsDraft';

interface Props {
  closeOut: boolean;
  experimentalGoogleCalendar: boolean;
  experimentalGmail: boolean;
  notebookContentsEnabled: boolean;
  onToggleCloseOut: () => void;
  onToggleGoogleCalendar: () => void;
  onToggleGmail: () => void;
  onToggleNotebookContents: () => void;
  draft: SettingsDraft;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
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
        <Text style={[styles.heading, styles.headingGap, {color: textColor}]}>Experimental</Text>
        <Text style={[styles.intro, {color: textColor}]}>
          These integrations depend on outside services and may be slow or stop working. Switching one off only hides it;
          your settings for it are kept.
        </Text>
        <SettingSwitch
          label="Google Calendar"
          on={p.experimentalGoogleCalendar}
          onPress={p.onToggleGoogleCalendar}
          hint="Shows your Google Calendar (via its private ICS link) in Daily, Week, Month, Inbox, Projects/Areas and Review, with its link on the right."
          textColor={textColor}
        />
        <SettingSwitch
          label="Gmail"
          on={p.experimentalGmail}
          onPress={p.onToggleGmail}
          hint="Adds the Gmail inbox step to the Weekly Review (IMAP with an app password) with the account on the right."
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
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <View style={styles.column}>
        {p.experimentalGoogleCalendar && (
          <>
            <Text style={[styles.heading, {color: textColor}]}>Google Calendar</Text>
            <CalendarFields draft={p.draft} textColor={textColor} borderColor={borderColor} placeholderColor={p.placeholderColor} />
          </>
        )}
        {p.experimentalGmail && (
          <>
            <Text style={[styles.heading, {color: textColor}]}>Gmail</Text>
            <GmailFields draft={p.draft} textColor={textColor} borderColor={borderColor} placeholderColor={p.placeholderColor} />
          </>
        )}
        {!p.experimentalGoogleCalendar && !p.experimentalGmail && (
          <Text style={[styles.intro, {color: textColor}]}>Switch on Google Calendar or Gmail to set up its link or account here.</Text>
        )}
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
  headingGap: {marginTop: SPACING.base},
  intro: {fontSize: FONT.small, opacity: 0.7, marginBottom: SPACING.base},
});

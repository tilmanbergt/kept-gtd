/**
 * Settings: one screen with sub-tabs (Folders, Contexts, Calendar, Gmail,
 * Note setups, Features, Advanced, About). Calendar and Gmail show only while
 * their experimental switch is on.
 *
 * Folders, Calendar and Gmail edit one shared draft
 * (useSettingsDraft.ts) that only the Save button at the bottom writes.
 * Everything else takes effect at once: Note setups saves each setup itself
 * (noteSetups/), Contexts saves each context itself, and the switches on Features, Advanced and About write immediately and
 * update the draft too, so a later Save can't write an old value back.
 *
 * The setup assistant (SetupAssistant.tsx) is drawn in place of the tabs while
 * it runs: started by App on a fresh install (`startSetup`), or with Run setup
 * assistant on the Folders tab.
 *
 * `initialTab` lets another screen land on a tab (e.g. a Google Calendar
 * panel's "Open Calendar Settings"). It is read once: a tab switch away from
 * Settings unmounts it.
 */
import React, {useState} from 'react';
import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import {featuresOf, Modules, modulesOf} from '../../domain/features';
import {FileFix, fileNameFixConfirmText, fileNameFixDoneText} from '../../domain/fileNameFix';
import {GtdParaSettings} from '../../domain/settings';
import {rebuildCache} from '../../storage/dataCache';
import {applyFileNameFixes} from '../../storage/fileNameFix';
import {runIntegrityCheck} from '../../storage/integrityCheck';
import {loadSettings, patchSettings} from '../../storage/settingsStorage';
import {setFeatures, useFeatures} from '../../ui/featureStore';
import {dropKeptTabs, setKeepTabsAlive} from '../../ui/keepAliveStore';
import MiniTabs, {MiniTabDef} from '../../ui/MiniTabs';
import {useStatus} from '../../ui/status/StatusProvider';
import {useThemeColors} from '../../ui/theme';
import {useStatusConfirm} from '../../ui/useStatusConfirm';
import {errorMessage} from '../../utils/errorMessage';
import {log, logError} from '../../utils/log';
import {setFileLogging} from '../../utils/logSink';
import {perfEnable} from '../../utils/perf';
import {requestEinkRefresh} from '../../utils/screenRefresh';
import AboutTab from './AboutTab';
import AdvancedTab from './AdvancedTab';
import DeviceCheckScreen from './DeviceCheckScreen';
import FeaturesTab from './FeaturesTab';
import ContextsTab from './contexts/ContextsTab';
import {useContextsDraft} from './contexts/useContextsDraft';
import {CalendarTab, FoldersTab, GmailTab} from './DraftTabs';
import {styles} from './settingsStyles';
import SetupAssistant from './SetupAssistant';
import TouchTestScreen from './TouchTestScreen';
import NoteSetupsTab from './noteSetups/NoteSetupsTab';
import {useMyStylePngs} from './noteSetups/useMyStylePngs';
import {useNoteSetupDraft} from './noteSetups/useNoteSetupDraft';
import {useSettingsDraft} from './useSettingsDraft';

export type SettingsTab = 'folders' | 'contexts' | 'calendar' | 'gmail' | 'templates' | 'features' | 'advanced' | 'about';
const SETTINGS_TABS: MiniTabDef<SettingsTab>[] = [
  {key: 'folders', label: 'Folders'},
  {key: 'contexts', label: 'Contexts'},
  {key: 'calendar', label: 'Calendar'},
  {key: 'gmail', label: 'Gmail'},
  {key: 'templates', label: 'Note setups'},
  {key: 'features', label: 'Features'},
  {key: 'advanced', label: 'Advanced'},
  {key: 'about', label: 'About'},
];

/** Tabs whose edits wait for the Save button. */
const DRAFT_TABS: SettingsTab[] = ['folders', 'calendar', 'gmail'];

type Result = {kind: 'success' | 'warning' | 'error'; text: string};

interface Props {
  /** Which sub-tab to land on when this screen mounts (read once). */
  initialTab?: SettingsTab;
  /** Switches the active profile (App.tsx resets and remounts the app) - docs/dev/history/technical-design-profiles-demo-space.md. */
  onSwitchProfile?: (id: string) => Promise<void>;
  /** Opens with the setup assistant running (a fresh install, read once). */
  startSetup?: boolean;
  /** The assistant closed: `finished` after Finish (App then opens the Projects tab), false after Skip. */
  onSetupClosed?: (finished: boolean) => void;
}

export default function Settings({initialTab, onSwitchProfile, startSetup = false, onSetupClosed}: Props): React.JSX.Element {
  const {isDarkMode, textColor, placeholderColor} = useThemeColors();
  // Settings keeps its own, slightly lighter border shade.
  const borderColor = isDarkMode ? '#444444' : '#cccccc';

  const [activeTabState, setActiveTab] = useState<SettingsTab>(initialTab ?? 'folders');
  const features = useFeatures();
  const settingsTabs = SETTINGS_TABS.filter(t => (t.key !== 'calendar' || features.googleCalendar) && (t.key !== 'gmail' || features.gmail));
  // A remembered tab that was just hidden falls back to Folders.
  const activeTab: SettingsTab = settingsTabs.some(t => t.key === activeTabState) ? activeTabState : 'folders';

  const draft = useSettingsDraft();
  const {values, setValues, setSaveError} = draft;
  const noteSetups = useNoteSetupDraft(values, setValues);
  const contextsDraft = useContextsDraft(values, setValues);
  const myStyle = useMyStylePngs();

  // Integrity Check and Fix file names (Advanced) - result and its action in the status slot.
  const [integrityCheckRunning, setIntegrityCheckRunning] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<Result | null>(null);
  const [fileNameFixes, setFileNameFixes] = useState<FileFix[]>([]);
  const confirmFileNameFix = useStatusConfirm('Settings.fileNameFix');
  // Advanced → Touch test, drawn in place of the settings while open.
  const [touchTestOpen, setTouchTestOpen] = useState(false);
  // Advanced → Check device files (debug logging on), drawn in place of the settings while open.
  const [deviceCheckOpen, setDeviceCheckOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(startSetup);
  // "Reload all files" (Advanced).
  const [reloading, setReloading] = useState(false);
  const [reloadResult, setReloadResult] = useState<{kind: 'success' | 'error'; text: string} | null>(null);
  useStatus('Settings.reload', reloadResult ? {...reloadResult, onDismiss: () => setReloadResult(null)} : null);

  const handleFixFileNames = async () => {
    const fixes = fileNameFixes;
    if (fixes.length === 0 || !(await confirmFileNameFix(fileNameFixConfirmText(fixes)))) return;
    setIntegrityResult(null);
    setFileNameFixes([]);
    setIntegrityCheckRunning(true);
    try {
      const result = await applyFileNameFixes(fixes);
      setIntegrityResult({
        kind: result.failed.length > 0 ? 'warning' : 'success',
        text: fileNameFixDoneText(result.renamed, result.linksUpdated, result.failed.length),
      });
    } catch (e) {
      setIntegrityResult({kind: 'error', text: `Fix file names failed: ${errorMessage(e)}`});
    } finally {
      setIntegrityCheckRunning(false);
    }
  };
  useStatus(
    'Settings.integrity',
    integrityResult
      ? {
          ...integrityResult,
          actions:
            fileNameFixes.length > 0
              ? [
                  {
                    label: `Fix file names (${fileNameFixes.length})`,
                    primary: true,
                    onPress: () => {
                      handleFixFileNames();
                    },
                  },
                ]
              : undefined,
          onDismiss: () => setIntegrityResult(null),
        }
      : null,
  );

  /** Runs against the current, possibly unsaved folder settings - the check only reads. */
  const handleRunIntegrityCheck = async () => {
    setIntegrityResult(null);
    setFileNameFixes([]);
    setIntegrityCheckRunning(true);
    try {
      const summary = await runIntegrityCheck(values);
      setFileNameFixes(summary.fileNameFixes);
      setIntegrityResult(
        summary.findings.length === 0
          ? {kind: 'success', text: `Integrity Check: no issues found (${summary.itemsScanned} items scanned) - report saved as ${summary.reportFileName} in EXPORT/kept-gtd/debug.`}
          : {
              kind: 'warning',
              text: `Integrity Check: ${summary.findings.length} issue(s) in ${summary.itemsScanned} items - see ${summary.reportFileName} in EXPORT/kept-gtd/debug.`,
            },
      );
    } catch (e) {
      setIntegrityResult({kind: 'error', text: `Integrity Check failed: ${errorMessage(e)}`});
    } finally {
      setIntegrityCheckRunning(false);
    }
  };

  /**
   * Re-reads every Project/Area from its file (with the saved settings),
   * drops the kept tabs so each loads again on its next visit, and lists the
   * MyStyle backgrounds again. Unsaved edits on the other tabs stay.
   */
  const handleReloadAllFiles = async () => {
    setReloadResult(null);
    setReloading(true);
    try {
      log('Settings: reload all files - start');
      const cache = await rebuildCache(await loadSettings());
      dropKeptTabs();
      myStyle.reload();
      log('Settings: reload all files - done', cache.items.length);
      setReloadResult({kind: 'success', text: `Reloaded ${cache.items.length} projects and areas from the files.`});
    } catch (e) {
      const message = errorMessage(e);
      logError('Settings: reload all files failed', message);
      setReloadResult({kind: 'error', text: `Reload failed: ${message}`});
    } finally {
      setReloading(false);
    }
  };

  /** A module switch (Settings → Features): applied, stored inside `modules`, and mirrored into the draft. */
  const toggleModule = async (key: keyof Modules) => {
    const nextModules = {...modulesOf(values), [key]: !modulesOf(values)[key]};
    const nextValues = {...values, modules: nextModules};
    setValues(v => ({...v, modules: nextModules}));
    setFeatures(featuresOf(nextValues));
    log('Settings: module switched', key, nextModules[key]);
    try {
      await patchSettings({modules: nextModules});
    } catch (e) {
      setSaveError(errorMessage(e));
    }
  };

  /** A switch that takes effect at once: applied, stored, and mirrored into the draft. */
  const toggleNow = async (key: keyof GtdParaSettings & ('perfTracing' | 'keepTabsAlive' | 'debugLogging' | 'experimentalGoogleCalendar' | 'experimentalGmail' | 'notebookContentsEnabled')) => {
    const next = !values[key];
    const nextValues = {...values, [key]: next};
    setValues(v => ({...v, [key]: next}));
    if (key === 'perfTracing') perfEnable(next);
    if (key === 'keepTabsAlive') setKeepTabsAlive(next);
    if (key === 'debugLogging') setFileLogging(next);
    if (key === 'experimentalGoogleCalendar' || key === 'experimentalGmail') setFeatures(featuresOf(nextValues));
    try {
      await patchSettings({[key]: next});
    } catch (e) {
      setSaveError(errorMessage(e));
    }
  };

  if (draft.loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.spacer} />
      </View>
    );
  }

  if (touchTestOpen) {
    return (
      <TouchTestScreen
        onClose={() => {
          setTouchTestOpen(false);
          requestEinkRefresh();
        }}
      />
    );
  }

  if (deviceCheckOpen) {
    return (
      <DeviceCheckScreen
        onClose={() => {
          setDeviceCheckOpen(false);
          requestEinkRefresh();
        }}
      />
    );
  }

  if (setupOpen) {
    return (
      <View style={[styles.container, styles.background]}>
        <View style={styles.content}>
          <SetupAssistant
            current={values}
            onDone={saved => {
              setSetupOpen(false);
              if (saved) {
                setValues(saved);
                setFeatures(featuresOf(saved));
              } else {
                setValues(v => ({...v, setupAssistant: 'done'}));
              }
              requestEinkRefresh();
              onSetupClosed?.(saved !== null);
            }}
            textColor={textColor}
            borderColor={borderColor}
            placeholderColor={placeholderColor}
          />
        </View>
      </View>
    );
  }

  const tabProps = {textColor, borderColor, placeholderColor};
  return (
    <View style={[styles.container, styles.background]}>
      <View style={styles.content}>
        <MiniTabs tabs={settingsTabs} activeKey={activeTab} onChange={setActiveTab} textColor={textColor} borderColor={borderColor} />

        <View style={styles.tabBody}>
          {activeTab === 'folders' && <FoldersTab draft={draft} onRunSetup={() => setSetupOpen(true)} {...tabProps} />}
          {activeTab === 'contexts' && <ContextsTab draft={contextsDraft} values={values} {...tabProps} />}
          {activeTab === 'calendar' && <CalendarTab draft={draft} {...tabProps} />}
          {activeTab === 'gmail' && <GmailTab draft={draft} {...tabProps} />}
          {activeTab === 'templates' && (
            <NoteSetupsTab draft={noteSetups} values={values} myStyle={myStyle} {...tabProps} />
          )}
          {activeTab === 'features' && (
            <FeaturesTab
              closeOut={modulesOf(values).closeOut}
              experimentalGoogleCalendar={values.experimentalGoogleCalendar}
              experimentalGmail={values.experimentalGmail}
              notebookContentsEnabled={values.notebookContentsEnabled}
              onToggleCloseOut={() => toggleModule('closeOut')}
              onToggleGoogleCalendar={() => toggleNow('experimentalGoogleCalendar')}
              onToggleGmail={() => toggleNow('experimentalGmail')}
              onToggleNotebookContents={() => toggleNow('notebookContentsEnabled')}
              textColor={textColor}
              borderColor={borderColor}
            />
          )}
          {activeTab === 'advanced' && (
            <AdvancedTab
              activeProfileId={values.activeProfileId}
              onSwitchProfile={onSwitchProfile}
              perfTracing={values.perfTracing}
              keepTabsAlive={values.keepTabsAlive}
              integrityCheckRunning={integrityCheckRunning}
              reloading={reloading}
              onReloadAllFiles={handleReloadAllFiles}
              onTogglePerfTracing={() => toggleNow('perfTracing')}
              onToggleKeepTabsAlive={() => toggleNow('keepTabsAlive')}
              onRunIntegrityCheck={handleRunIntegrityCheck}
              onOpenTouchTest={() => setTouchTestOpen(true)}
              debugLogging={values.debugLogging}
              onOpenDeviceCheck={() => setDeviceCheckOpen(true)}
              textColor={textColor}
              borderColor={borderColor}
            />
          )}
          {activeTab === 'about' && (
            <AboutTab debugLogging={values.debugLogging} onToggleDebugLogging={() => toggleNow('debugLogging')} textColor={textColor} borderColor={borderColor} />
          )}
        </View>

        {DRAFT_TABS.includes(activeTab) && (
          <>
            <Pressable style={styles.saveButton} onPress={draft.handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                draft.handleResetDefaults();
                noteSetups.handleCancel();
              }}
              style={styles.resetButton}>
              <Text style={[styles.resetText, {color: textColor}]}>Reset to defaults</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

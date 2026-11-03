/**
 * The setup assistant (requirements S1-S3, docs/dev/history/technical-design-easy-start.md §5.3):
 * five steps - Folders, Notes, Features, Updates (docs/dev/history/technical-design-in-app-updates.md
 * §6.4), Look around first? - and Finish, drawn
 * in Settings in place of its tabs. Each step has ? Help (its help page) and a
 * line saying where to change it later; Back, Next and Skip are always on
 * screen. Finish lists exactly what it creates and saves; nothing happens before
 * it (Skip only marks the assistant done). Decisions: domain/setupAssistant.ts;
 * reads and writes: storage/setupAssistant.ts.
 *
 * Access first (docs/dev/history/technical-design-fresh-start-profile.md §3.6): before it reads
 * anything, the assistant says why it needs file access and asks read, then write; refused, it
 * stops with Try again and Skip - no scan, no plan, no Welcome back.
 *
 * On fresh settings, the first look at the base folder (after the file permissions) is followed by
 * one look for saved profiles; when there are any, Welcome back (WelcomeBack.tsx) comes first and
 * offers to load one (docs/dev/history/technical-design-fresh-start-profile.md §3.3).
 */
import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {demoSpaceCreatedText, profileLoadedText, setupFinishedText} from '../../domain/fileChangeText';
import {
  FOLDER_ROLES,
  FolderRole,
  folderStatus,
  FolderStatus,
  folderStatusText,
  initialChoices,
  planFinish,
  SetupChoices,
  suggestFolders,
} from '../../domain/setupAssistant';
import {GtdParaSettings} from '../../domain/settings';
import {UPDATE_DISCLAIMER} from '../../domain/updateCheck';
import {createDemoSpace} from '../../storage/demoSpace';
import {listSavedProfiles, ProfileInfo} from '../../storage/profiles';
import {BaseScan, finishSetup, scanBaseFolder, skipSetup} from '../../storage/setupAssistant';
import {displayPath} from '../../supernote/devicePaths';
import {ensureFileReadPermission, ensureFileWritePermission} from '../../supernote/pluginPermissions';
import {requestHelp} from '../../ui/helpStore';
import PillButton from '../../ui/PillButton';
import {useStatus, useStatusApi} from '../../ui/status/StatusProvider';
import {FONT, SPACING} from '../../ui/theme';
import {errorMessage} from '../../utils/errorMessage';
import {log, logError} from '../../utils/log';
import {refreshEinkNow, requestEinkRefresh} from '../../utils/screenRefresh';
import CheckToggle from './CheckToggle';
import {styles as settingsStyles} from './settingsStyles';
import WelcomeBack from './WelcomeBack';

const ROLE_LABEL: Record<FolderRole, string> = {projects: 'Projects folder', areas: 'Areas folder', resources: 'Resources folder', archive: 'Archive folder'};
const STEP_COUNT = 5;
/** The help page (and heading) behind each step's ? Help, Finish last. */
const STEP_HELP: Array<[string, string | null]> = [
  ['getting-started', 'your-folders'],
  ['note-setups', 'the-default'],
  ['features', null],
  ['settings', 'updates'],
  ['profiles-and-demo', 'the-demo-space'],
  ['settings', 'setup-assistant'],
];
const CHANGE_LATER = ['Settings → Data', 'Settings → Note setups → Default', 'Settings → Features', 'Settings → About', 'Settings → Data'];
const SCAN_DELAY_MS = 500;
const FINISHED_STATUS_ID = 'SetupAssistant.finished';
const LOADED_STATUS_ID = 'SetupAssistant.profileLoaded';
const ACCESS_TEXT = 'Kept needs to read and write your Project and Area folders and its own files in EXPORT/kept-gtd.';
const NO_ACCESS_TEXT = "Kept can't work without access to your files.";

interface Props {
  /** The settings the assistant starts from (Settings' draft). */
  current: GtdParaSettings;
  /** Closed: `saved` is set after Finish. */
  onDone: (saved: GtdParaSettings | null) => void;
  /** Loads a saved profile (App's profile switch, which remounts the app); rejects with a message. */
  onLoadProfile?: (id: string) => Promise<void>;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function SetupAssistant({current, onDone, onLoadProfile, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<SetupChoices>(() => initialChoices(current, {}));
  const [scan, setScan] = useState<BaseScan | null>(null);
  const [suggested, setSuggested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{kind: 'error' | 'success'; text: string} | null>(null);
  useStatus('SetupAssistant.message', message ? {...message, onDismiss: () => setMessage(null)} : null);
  const statusApi = useStatusApi();

  // File access, asked one after the other (never in parallel); `accessTry` counts Try again.
  const [access, setAccess] = useState<'asking' | 'granted' | 'denied'>('asking');
  const [accessTry, setAccessTry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setAccess('asking');
    (async () => {
      // The line saying why is on the e-ink screen before the host's dialog covers it.
      await refreshEinkNow();
      if (cancelled) return;
      const read = await ensureFileReadPermission();
      const write = read && (await ensureFileWritePermission());
      if (cancelled) return;
      if (!(read && write)) log('SetupAssistant: file access refused', read ? 'write' : 'read');
      setAccess(read && write ? 'granted' : 'denied');
      requestEinkRefresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [accessTry]);

  // What Kept finds in the base folder, read again a moment after the base changes.
  const base = choices.baseRoot.trim();
  const scannedOnce = useRef(false);
  useEffect(() => {
    if (access !== 'granted') return;
    let cancelled = false;
    setScan(null);
    const delay = scannedOnce.current ? SCAN_DELAY_MS : 0;
    scannedOnce.current = true;
    const timer = setTimeout(() => {
      scanBaseFolder(base)
        .then(result => {
          if (cancelled) return;
          setScan(result);
          requestEinkRefresh();
        })
        .catch(e => {
          if (!cancelled) setScan({entries: [], childCounts: {}});
          logError('SetupAssistant: reading the base folder failed', errorMessage(e));
        });
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [base, access]);
  // Fresh settings: after the first read (the permission is granted by then), the saved profiles,
  // once. null while that look is pending; Welcome back shows while `welcome` holds some.
  const offerSaved = current.freshStart && !!onLoadProfile;
  const [welcome, setWelcome] = useState<ProfileInfo[] | null>(offerSaved ? null : []);
  useEffect(() => {
    if (!scan || welcome !== null) return;
    let cancelled = false;
    listSavedProfiles()
      .catch(e => {
        logError('SetupAssistant: looking for saved profiles failed', errorMessage(e));
        return [];
      })
      .then(found => {
        if (cancelled) return;
        if (found.length > 0) log('SetupAssistant: offering saved profiles', found.length);
        setWelcome(found);
        requestEinkRefresh();
      });
    return () => {
      cancelled = true;
    };
  }, [scan, welcome]);

  const handleLoad = async (profile: ProfileInfo) => {
    if (!onLoadProfile) return;
    setBusy(true);
    setMessage(null);
    try {
      await onLoadProfile(profile.id);
      statusApi.show(LOADED_STATUS_ID, {
        kind: 'success',
        text: profileLoadedText(profile.name),
        scope: 'global',
        onDismiss: () => statusApi.clear(LOADED_STATUS_ID),
      });
    } catch (e) {
      setMessage({kind: 'error', text: `Not loaded: ${errorMessage(e)}`});
      setBusy(false);
    }
  };

  // The first read suggests existing folders (`Projects`, `1 Projects` …), once.
  useEffect(() => {
    if (!scan || suggested) return;
    setSuggested(true);
    const found = suggestFolders(scan.entries);
    setChoices(c => ({...c, folders: {...c.folders, ...found}}));
  }, [scan, suggested]);

  const statusOf = (role: FolderRole): FolderStatus | null => (scan ? folderStatus(choices.folders[role], scan.entries, scan.childCounts) : null);
  const statuses = (): Record<FolderRole, FolderStatus> =>
    Object.fromEntries(FOLDER_ROLES.map(role => [role, statusOf(role) ?? {exists: false, subfolders: 0}])) as Record<FolderRole, FolderStatus>;

  const go = (next: number) => {
    setMessage(null);
    setStep(next);
    requestEinkRefresh();
  };

  const handleSkip = async () => {
    setBusy(true);
    try {
      await skipSetup();
      onDone(null);
    } catch (e) {
      setMessage({kind: 'error', text: `Not skipped: ${errorMessage(e)}`});
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    setBusy(true);
    try {
      const result = await finishSetup(planFinish(choices, current, statuses()));
      statusApi.show(FINISHED_STATUS_ID, {
        kind: result.failed.length > 0 ? 'warning' : 'success',
        text: `${setupFinishedText(result.created, result.failed, displayPath(result.base))} Create your first project here.`,
        scope: 'global',
        onDismiss: () => statusApi.clear(FINISHED_STATUS_ID),
      });
      onDone(result.settings);
    } catch (e) {
      setMessage({kind: 'error', text: `Setup not saved: ${errorMessage(e)}`});
      setBusy(false);
    }
  };

  const handleDemo = async () => {
    setBusy(true);
    try {
      const r = await createDemoSpace();
      setMessage({kind: 'success', text: demoSpaceCreatedText(r.written, r.skipped, r.profileCreated)});
    } catch (e) {
      setMessage({kind: 'error', text: `Demo space not created: ${errorMessage(e)}`});
    } finally {
      setBusy(false);
    }
  };

  const pill = {textColor, borderColor};
  const text = [styles.text, {color: textColor}];
  const option = (label: string, checked: boolean, onPress: () => void, hint: string) => (
    <View style={styles.option}>
      <CheckToggle label={label} checked={checked} onPress={onPress} textColor={textColor} />
      <Text style={[styles.hint, {color: textColor}]}>{hint}</Text>
    </View>
  );

  const body = (() => {
    if (step === 0) {
      return (
        <>
          <Text style={text}>Kept keeps everything in four folders inside the base folder. It suggests folders you already have; the ones that are missing are created on Finish. Nothing is moved, and every subfolder of the Projects and Areas folders becomes a project or area.</Text>
          <View style={settingsStyles.field}>
            <Text style={[settingsStyles.label, {color: textColor}]}>Base folder</Text>
            <TextInput
              style={[settingsStyles.input, {color: textColor, borderColor}]}
              value={choices.baseRoot}
              onChangeText={baseRoot => setChoices(c => ({...c, baseRoot}))}
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {FOLDER_ROLES.map(role => {
            const status = statusOf(role);
            return (
              <View key={role} style={styles.folderField}>
                <Text style={[settingsStyles.label, {color: textColor}]}>{ROLE_LABEL[role]}</Text>
                <TextInput
                  style={[settingsStyles.input, {color: textColor, borderColor}]}
                  value={choices.folders[role]}
                  onChangeText={name => setChoices(c => ({...c, folders: {...c.folders, [role]: name}}))}
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.hint, {color: textColor}]}>{status ? folderStatusText(status) : 'checking…'}</Text>
              </View>
            );
          })}
        </>
      );
    }
    if (step === 1) {
      return (
        <>
          <Text style={text}>Every todo and meeting can have a handwritten note. Where do the notes go?</Text>
          {option('One notebook per project and year (recommended)', choices.notes === 'notebook', () => setChoices(c => ({...c, notes: 'notebook'})), 'Everything of a project in one notebook, "Garden renovation 2026", a page per todo or meeting in time order.')}
          {option('Own note per todo or meeting', choices.notes === 'own', () => setChoices(c => ({...c, notes: 'own'})), "A note of its own in the project's Todos or Meetings folder.")}
        </>
      );
    }
    if (step === 2) {
      return (
        <>
          <Text style={text}>Start simple or with everything switched on?</Text>
          {option('Simple', choices.features === 'simple', () => setChoices(c => ({...c, features: 'simple'})), 'Project close-out, Google Calendar, Gmail and Notebook contents off.')}
          {option('Everything', choices.features === 'everything', () => setChoices(c => ({...c, features: 'everything'})), 'All on. Google Calendar and Gmail still need their addresses in Settings → Features.')}
        </>
      );
    }
    if (step === 3) {
      return (
        <>
          <Text style={text}>Kept can tell you when a new version is on GitHub and save it to MyStyle/kept-gtd, ready to install from the Supernote's plugin settings.</Text>
          {option('Check for new versions on GitHub once a day', choices.updates === 'daily', () => setChoices(c => ({...c, updates: 'daily'})), 'When Kept opens, at most once a day. Kept asks for internet access once, on Finish.')}
          {option('Only when I tap Check now', choices.updates === 'manual', () => setChoices(c => ({...c, updates: 'manual'})), 'In Settings → About. Nothing goes over the network until then.')}
          <Text style={[styles.hint, {color: textColor}]}>{UPDATE_DISCLAIMER}</Text>
        </>
      );
    }
    if (step === 4) {
      return (
        <>
          <Text style={text}>Look around first? The demo space is a small made-up setup in Note/kept-gtd-demo, with its own profile "Demo". Your own folders stay untouched.</Text>
          <View style={styles.buttons}>
            <PillButton label="Create demo space" onPress={handleDemo} disabled={busy} {...pill} />
          </View>
          <Text style={text}>To switch to it, open Settings → Data → Profiles and tap Switch next to Demo; switch back to Production the same way.</Text>
        </>
      );
    }
    const plan = planFinish(choices, current, statuses());
    return (
      <>
        <Text style={text}>
          {plan.foldersToCreate.length > 0
            ? `Kept will create in ${displayPath(base || current.baseRoot)}: ${plan.foldersToCreate.join(', ')}.`
            : 'Kept will create no folder: they all exist.'}
        </Text>
        <Text style={text}>
          {`And save: notes - ${choices.notes === 'notebook' ? 'one notebook per project and year' : 'own note per todo or meeting'}; features - ${choices.features === 'simple' ? 'Simple' : 'Everything'}; updates - ${choices.updates === 'daily' ? 'checked once a day' : 'only when you tap Check now'}.`}
        </Text>
        <Text style={text}>Nothing is moved, renamed or deleted. Afterwards Kept opens the Projects tab.</Text>
      </>
    );
  })();

  if (access !== 'granted') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, {borderColor}]}>
          <Text style={[styles.title, {color: textColor}]}>Setup</Text>
          <View style={styles.buttons}>
            <PillButton label="? Help" onPress={() => requestHelp('settings', 'setup-assistant')} {...pill} />
            <PillButton label="Skip" onPress={handleSkip} disabled={busy} {...pill} />
          </View>
        </View>
        <View style={styles.body}>
          <Text style={text}>{ACCESS_TEXT}</Text>
          {access === 'denied' && (
            <>
              <Text style={[text, styles.bold]}>{NO_ACCESS_TEXT}</Text>
              <View style={styles.buttons}>
                <PillButton label="Try again" size="large" primary onPress={() => setAccessTry(n => n + 1)} disabled={busy} {...pill} />
              </View>
            </>
          )}
        </View>
      </View>
    );
  }
  if (welcome === null) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, {color: textColor}]}>Setup</Text>
        <Text style={text}>Looking for settings you saved earlier…</Text>
      </View>
    );
  }
  if (welcome.length > 0) {
    return (
      <WelcomeBack
        profiles={welcome}
        onLoad={handleLoad}
        onStartFresh={() => {
          setWelcome([]);
          go(0);
        }}
        busy={busy}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  }

  const finishScreen = step === STEP_COUNT;
  return (
    <View style={styles.container}>
      <View style={[styles.header, {borderColor}]}>
        <Text style={[styles.title, {color: textColor}]}>{finishScreen ? 'Setup · Finish' : `Setup · ${step + 1} of ${STEP_COUNT}`}</Text>
        <View style={styles.buttons}>
          <PillButton label="? Help" onPress={() => requestHelp(STEP_HELP[step][0], STEP_HELP[step][1])} {...pill} />
          <PillButton label="Skip" onPress={handleSkip} disabled={busy} {...pill} />
        </View>
      </View>
      <View style={styles.body}>{body}</View>
      <View style={styles.footer}>
        {!finishScreen && <Text style={[styles.hint, {color: textColor}]}>Change later: {CHANGE_LATER[step]}</Text>}
        <View style={styles.buttons}>
          {step > 0 && <PillButton label="‹ Back" size="large" onPress={() => go(step - 1)} disabled={busy} {...pill} />}
          {finishScreen ? (
            <PillButton label="Finish" size="large" primary onPress={handleFinish} disabled={busy} {...pill} />
          ) : (
            <PillButton label="Next ›" size="large" primary onPress={() => go(step + 1)} disabled={busy} {...pill} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: SPACING.sm, marginBottom: SPACING.md},
  title: {fontSize: FONT.medium, fontWeight: '700'},
  buttons: {flexDirection: 'row', alignItems: 'center', gap: SPACING.sm},
  body: {maxWidth: 640},
  text: {fontSize: FONT.medium, marginBottom: SPACING.md},
  folderField: {marginBottom: SPACING.md},
  option: {marginBottom: SPACING.md},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
  bold: {fontWeight: '700'},
  footer: {marginTop: SPACING.lg, gap: SPACING.sm},
});

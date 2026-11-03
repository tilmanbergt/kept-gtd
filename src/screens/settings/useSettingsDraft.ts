/**
 * The draft of the settings edited in fields - the folders on Data, the Google Calendar link and
 * the Gmail account on Features: loaded once, edited freely, written block by block by that
 * block's Save (folders: or set back by Reset to defaults). Settings that take effect at once
 * (switches, Note setups) write themselves and also update this draft.
 */
import {useEffect, useState} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {DEFAULT_SETTINGS, GtdParaSettings} from '../../domain/settings';
import {clearCachedData} from '../../storage/dataCache';
import {clearCachedGmailInbox} from '../../storage/gmailInboxCache';
import {renameInboxFolderForSave} from '../../storage/inboxFolder';
import {loadSettings, saveSettings} from '../../storage/settingsStorage';
import {useErrorStatus, useStatus} from '../../ui/status/StatusProvider';
import {errorMessage} from '../../utils/errorMessage';
import {useEinkRefreshOnLoad} from '../../utils/screenRefresh';

type PathKey = 'projects' | 'areas' | 'inboxFolder' | 'resources' | 'archive';

/** The string-valued settings fields this section edits - narrower than `keyof GtdParaSettings`, so `values[field.key]` stays a plain string for the TextInput `value` prop. */
export type StringSettingKey = 'baseRoot' | 'projectsFolder' | 'areasFolder' | 'inboxFolder' | 'resourcesFolder' | 'archiveFolder' | 'gmailEmail' | 'gmailAppPassword' | 'gmailImapHost';

export const FIELDS: Array<{
  key: StringSettingKey;
  label: string;
  placeholder: string;
  pathKey?: PathKey;
}> = [
  {key: 'baseRoot', label: 'Base root', placeholder: DEFAULT_SETTINGS.baseRoot},
  {
    key: 'projectsFolder',
    label: 'Projects folder',
    placeholder: DEFAULT_SETTINGS.projectsFolder,
    pathKey: 'projects',
  },
  {
    key: 'areasFolder',
    label: 'Areas folder',
    placeholder: DEFAULT_SETTINGS.areasFolder,
    pathKey: 'areas',
  },
  {
    // The Inbox's own folder inside Areas (docs/dev/history/technical-design-inbox-as-area.md §3.5).
    key: 'inboxFolder',
    label: 'Inbox folder',
    placeholder: DEFAULT_SETTINGS.inboxFolder,
    pathKey: 'inboxFolder',
  },
  {
    key: 'resourcesFolder',
    label: 'Resources folder',
    placeholder: DEFAULT_SETTINGS.resourcesFolder,
    pathKey: 'resources',
  },
  {
    key: 'archiveFolder',
    label: 'Archive folder',
    placeholder: DEFAULT_SETTINGS.archiveFolder,
    pathKey: 'archive',
  },
];

/** The blocks with a Save of their own: the folder fields on Data, Calendar and Gmail on Features. */
export type SaveScope = 'folders' | 'calendar' | 'gmail';

const SCOPE_KEYS: Record<SaveScope, Array<keyof GtdParaSettings>> = {
  folders: ['baseRoot', 'projectsFolder', 'areasFolder', 'inboxFolder', 'resourcesFolder', 'archiveFolder'],
  calendar: ['googleCalendarIcsUrl'],
  gmail: ['gmailEmail', 'gmailAppPassword', 'gmailImapHost', 'gmailHideHandled'],
};

export function useSettingsDraft() {
  const [values, setValues] = useState<GtdParaSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  // What is stored for the fields here, as loaded or last saved - what "unsaved" compares with.
  const [baseline, setBaseline] = useState<GtdParaSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  // Extra sentence for the saved message, e.g. after the Inbox folder was renamed.
  const [savedNote, setSavedNote] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  useStatus('Settings.saved', saved ? {kind: 'success', text: `Settings saved.${savedNote}`, onDismiss: () => setSaved(false)} : null);
  useErrorStatus('Settings.saveError', saveError, () => setSaveError(null));
  useErrorStatus('Settings.clipboardError', clipboardError, () => setClipboardError(null));
  useEinkRefreshOnLoad(loading);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then(loaded => {
        if (cancelled) return;
        setValues(loaded);
        setBaseline(loaded);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (next: Partial<GtdParaSettings>) => {
    setSaved(false);
    setValues(prev => ({...prev, ...next}));
  };
  const update = (key: StringSettingKey, text: string) => patch({[key]: text});

  /** Puts the clipboard's text (trimmed) into a field - the Calendar link and the Gmail app password are pasted, not typed. */
  const pasteInto = async (apply: (text: string) => void) => {
    setClipboardError(null);
    try {
      apply((await Clipboard.getString()).trim());
    } catch (e) {
      setClipboardError(errorMessage(e));
    }
  };

  /**
   * Save for one block (docs/dev/history/technical-design-settings-tabs.md §3): cleans that
   * block's fields and writes only them over what is stored, so a Save on Features never writes
   * an unsaved folder edit on Data, and the other way round.
   */
  const saveFields = async (scope: SaveScope) => {
    setSaveError(null);
    try {
      // Written elsewhere while this screen may be open (the What's-new notice, switches
      // that save at once) - the base is what is stored, not this screen's copy.
      const storedNow = await loadSettings();
      // Blank folder fields fall back to the default rather than resolving to a broken path
      // segment; an empty calendar link or Gmail address is itself meaningful ("not set up").
      const cleaned: Partial<GtdParaSettings> =
        scope === 'folders'
          ? {
              baseRoot: values.baseRoot.trim() || DEFAULT_SETTINGS.baseRoot,
              projectsFolder: values.projectsFolder.trim() || DEFAULT_SETTINGS.projectsFolder,
              areasFolder: values.areasFolder.trim() || DEFAULT_SETTINGS.areasFolder,
              resourcesFolder: values.resourcesFolder.trim() || DEFAULT_SETTINGS.resourcesFolder,
              archiveFolder: values.archiveFolder.trim() || DEFAULT_SETTINGS.archiveFolder,
              inboxFolder: values.inboxFolder.trim() || DEFAULT_SETTINGS.inboxFolder,
            }
          : scope === 'calendar'
            ? {googleCalendarIcsUrl: values.googleCalendarIcsUrl.trim()}
            : {
                gmailEmail: values.gmailEmail.trim(),
                gmailAppPassword: values.gmailAppPassword.trim(),
                gmailImapHost: values.gmailImapHost.trim() || DEFAULT_SETTINGS.gmailImapHost,
                gmailHideHandled: values.gmailHideHandled,
              };
      const next: GtdParaSettings = {...storedNow, ...cleaned};
      let note = '';
      if (scope === 'folders') {
        // A new Inbox folder name moves the folder first; a problem throws and nothing is saved.
        const inboxRename = await renameInboxFolderForSave(storedNow, next);
        note =
          inboxRename === 'moved'
            ? ' Inbox folder renamed.'
            : inboxRename === 'notMoved'
              ? ' The Inbox folder was not moved, because Base root or Areas changed too.'
              : '';
      }
      await saveSettings(next);
      // The cache was built for the folders before; the Gmail list for the account before.
      if (scope === 'folders') clearCachedData();
      if (scope === 'gmail') clearCachedGmailInbox();
      setValues(prev => ({...prev, ...cleaned}));
      setBaseline(next);
      setSavedNote(note);
      setSaved(true);
    } catch (e) {
      // Show a failed AsyncStorage write, so the button never looks like it did nothing at all.
      setSaveError(errorMessage(e));
    }
  };

  /** Whether `scope`'s fields differ from what is stored. */
  const unsaved = (scope: SaveScope): boolean => SCOPE_KEYS[scope].some(key => values[key] !== baseline[key]);

  /** Reset to defaults under the folder fields: only those fields, in the draft. */
  const resetFolders = () => {
    setValues(prev => ({...prev, ...Object.fromEntries(SCOPE_KEYS.folders.map(key => [key, DEFAULT_SETTINGS[key]]))}));
    setSaved(false);
    setSaveError(null);
  };

  return {values, setValues, loading, patch, update, pasteInto, saveFields, unsaved, resetFolders, setSaveError};
}

export type SettingsDraft = ReturnType<typeof useSettingsDraft>;

/**
 * Profile files on the device (docs/dev/history/technical-design-profiles-demo-space.md
 * §3.1-3.2): EXPORT/kept-gtd/profiles/<id>.json. The active settings stay in
 * AsyncStorage as before; the files are snapshots that a switch writes (the
 * profile being left) and reads (the profile being entered). Secrets are
 * kept per profile in AsyncStorage, never in a file.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildActiveSettings,
  DEFAULT_PROFILE_ID,
  DEFAULT_PROFILE_NAME,
  isValidProfileId,
  parseProfile,
  ProfileSecrets,
  secretsOf,
  serializeProfile,
} from '../domain/profiles';
import {GtdParaSettings} from '../domain/settings';
import {buildVersionText} from '../domain/buildVersionText';
import {BUILD_INFO} from '../generated/buildInfo';
import {PROFILES_FOLDER_PATH} from '../supernote/devicePaths';
import {ensureFolderExists, listFolderEntries, readTextFile, writeTextFile} from '../supernote/fileSystem';
import {log, logWarn} from '../utils/log';
import {loadSettings, patchSettings, replaceUnreadableSettings, saveSettings} from './settingsStorage';
import {getSettingsUnreadable} from './settingsUnreadable';
import {errorMessage} from '../utils/errorMessage';
import {SECRETS_KEY} from '../domain/storeKeys';

export interface ProfileInfo {
  id: string;
  name: string;
  savedAt: string | null;
  /** Set when the file exists but can't be used (shown in the list, not switchable). */
  error?: string;
}

function profilePath(id: string): string {
  return `${PROFILES_FOLDER_PATH}/${id}.json`;
}

async function readSecretsMap(): Promise<Record<string, ProfileSecrets>> {
  try {
    const raw = await AsyncStorage.getItem(SECRETS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    logWarn('profiles: stored secrets unreadable, none used', errorMessage(e));
    return {};
  }
}

async function writeSecrets(id: string, secrets: ProfileSecrets): Promise<void> {
  const map = await readSecretsMap();
  map[id] = secrets;
  await AsyncStorage.setItem(SECRETS_KEY, JSON.stringify(map));
}

/** Every profile file in the folder; unreadable files come with `error`. Never creates the folder. */
async function readProfileInfos(): Promise<ProfileInfo[]> {
  const entries = await listFolderEntries(PROFILES_FOLDER_PATH);
  const infos: ProfileInfo[] = [];
  for (const entry of entries) {
    if (entry.isFolder || !entry.name.toLowerCase().endsWith('.json')) {
      continue;
    }
    const id = entry.name.slice(0, -'.json'.length);
    if (!isValidProfileId(id)) {
      infos.push({id, name: entry.name, savedAt: null, error: 'file name must be lowercase letters, digits and "-"'});
      continue;
    }
    try {
      const text = await readTextFile(entry.path);
      const parsed = parseProfile(text ?? '', id);
      infos.push({id, name: parsed.name, savedAt: parsed.savedAt});
    } catch (e) {
      infos.push({id, name: id, savedAt: null, error: errorMessage(e)});
    }
  }
  return infos;
}

/** All profile files, default profile first, then by name. Unreadable files are listed with `error`. */
export async function listProfiles(): Promise<ProfileInfo[]> {
  await ensureFolderExists(PROFILES_FOLDER_PATH);
  const infos = await readProfileInfos();
  return infos.sort((a, b) =>
    a.id === DEFAULT_PROFILE_ID ? -1 : b.id === DEFAULT_PROFILE_ID ? 1 : a.name.localeCompare(b.name),
  );
}

/**
 * The profiles the setup assistant can offer (docs/dev/history/technical-design-fresh-start-profile.md
 * §3.2): only readable files, newest `savedAt` first. Read-only - a missing folder means none
 * and is not created.
 */
export async function listSavedProfiles(): Promise<ProfileInfo[]> {
  const infos = (await readProfileInfos()).filter(p => !p.error);
  log('profiles: saved profiles found', infos.length);
  return infos.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
}

async function readProfileName(id: string): Promise<string | null> {
  const text = await readTextFile(profilePath(id));
  if (text == null) {
    return null;
  }
  try {
    return parseProfile(text, id).name;
  } catch {
    // silent: the list shows the file without a name
    return null;
  }
}

/** Writes `settings` as profile `id` (file + secrets). Keeps the name already in the file unless `name` is given. */
export async function writeProfile(id: string, settings: GtdParaSettings, name?: string): Promise<void> {
  if (!isValidProfileId(id)) {
    throw new Error(`invalid profile id "${id}"`);
  }
  if (getSettingsUnreadable() !== null) {
    throw new Error('Not saved: your stored settings could not be read, so Kept GTD runs on defaults and saves no profile from them.');
  }
  await ensureFolderExists(PROFILES_FOLDER_PATH);
  const finalName = name ?? (await readProfileName(id)) ?? (id === DEFAULT_PROFILE_ID ? DEFAULT_PROFILE_NAME : id);
  await writeTextFile(profilePath(id), serializeProfile(finalName, settings, new Date(), buildVersionText(BUILD_INFO)));
  await writeSecrets(id, secretsOf(settings));
  log('profiles: saved profile', id);
}

/** "Save": the active settings into the active profile's file; ends a fresh start (they are now on file). */
export async function saveActiveProfile(): Promise<string> {
  const settings = await loadSettings();
  await writeProfile(settings.activeProfileId, settings);
  if (settings.freshStart) await patchSettings({freshStart: false});
  return settings.activeProfileId;
}

/**
 * Before the first switch ever: puts the user's real setup on file as
 * production.json, so it can always be switched back to. No-op when the
 * file exists or another profile is active.
 */
export async function ensureDefaultProfileFile(): Promise<void> {
  const settings = await loadSettings();
  if (settings.activeProfileId !== DEFAULT_PROFILE_ID || getSettingsUnreadable() !== null) {
    return;
  }
  const existing = await readTextFile(profilePath(DEFAULT_PROFILE_ID));
  if (existing == null) {
    await writeProfile(DEFAULT_PROFILE_ID, settings, DEFAULT_PROFILE_NAME);
  }
}

/**
 * Switches to profile `targetId` (§3.2): saves the active profile to its
 * file, then builds and stores the target's settings. Resolves to the new
 * active settings; the caller resets in-memory state and remounts (§3.4).
 * Throws (nothing changed) when the target can't be read.
 *
 * Unreadable or fresh settings (docs/dev/history/technical-design-fresh-start-profile.md §3.2)
 * keep the files as they are: nothing is saved first, and a switch to the active id loads its
 * file. The result always ends a fresh start and the setup assistant.
 */
export async function switchProfile(targetId: string): Promise<GtdParaSettings> {
  const text = await readTextFile(profilePath(targetId));
  if (text == null) {
    throw new Error(`profile file ${targetId}.json not found`);
  }
  const target = parseProfile(text, targetId);
  const current = await loadSettings();
  // Unreadable settings (storage/settingsUnreadable.ts) are the defaults, fresh ones were never
  // saved: neither is saved as a profile, and the switch - also to the active profile - is how
  // to get the saved settings back.
  const unreadable = getSettingsUnreadable() !== null;
  const keepFiles = unreadable || current.freshStart;
  if (current.activeProfileId === targetId && !keepFiles) {
    return current;
  }
  if (!keepFiles) await writeProfile(current.activeProfileId, current);
  const secrets = (await readSecretsMap())[targetId] ?? {};
  const next: GtdParaSettings = {
    ...buildActiveSettings(targetId, target.settings, secrets, current),
    freshStart: false,
    setupAssistant: 'done',
  };
  if (unreadable) await replaceUnreadableSettings(next);
  else await saveSettings(next);
  log('profiles: switched', current.activeProfileId, '->', targetId, keepFiles ? '(nothing saved first)' : '');
  // Re-read so the normal load migrations run on the new settings.
  return loadSettings();
}

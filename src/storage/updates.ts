/**
 * The in-app updater's I/O (docs/dev/history/technical-design-in-app-updates.md §3, §4): the
 * check against GitHub's latest release, the download into `MyStyle/kept-gtd/`, and the
 * device-local bookkeeping (when it last checked, what it found, Not now, what it saved).
 * The rules are in domain/updateCheck.ts, the download itself in KeptUpdateModule.kt.
 *
 * No network call without a tap or the user's daily-check choice; the silent check never shows
 * a permission dialog. Nothing is deleted outside the private temp folder.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AvailableUpdate,
  LATEST_RELEASE_URL,
  MAX_ASSET_BYTES,
  MAX_NAME_ATTEMPTS,
  RunningVersion,
  TEST_RUNNING_VERSION,
  UPDATE_FOLDER,
  UpdateCheckMode,
  UpdateCheckResult,
  UpdateDownloadResult,
  assetName,
  checkResultText,
  downloadFileName,
  isNewer,
  parseLatestRelease,
  runningVersion,
} from '../domain/updateCheck';
import {UPDATE_STATE_KEY} from '../domain/storeKeys';
import {BUILD_INFO} from '../generated/buildInfo';
import {INTERNAL_STORAGE, displayPath} from '../supernote/devicePaths';
import {notifyFolderChanged} from '../supernote/fileNative';
import {deleteTempTree, ensureFolderExists, getPrivateTempDir, statFiles} from '../supernote/fileSystem';
import {withTimeout} from '../supernote/hostCall';
import {INTERNET_PERMISSION, ensureFileWritePermission, ensureInternetPermission, hasPluginPermission} from '../supernote/pluginPermissions';
import {getKeptUpdateNative} from '../supernote/updateNative';
import {errorMessage} from '../utils/errorMessage';
import {log, logError, logWarn} from '../utils/log';
import {patchSettings} from './settingsStorage';

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = `KeptGTD/${BUILD_INFO.label}`;
/** About's status line after a daily check found no INTERNET grant (it never asks). */
export const DAILY_NEEDS_PERMISSION_TEXT = 'The daily check needs internet access - tap Check now.';
export const UPDATE_DOWNLOAD_FOLDER = `${INTERNAL_STORAGE}/${UPDATE_FOLDER}`;

/** What is stored (design §3). */
export interface UpdateState {
  /** Last check GitHub answered (by hand or automatic), ms. */
  lastCheckAt: number | null;
  /** What that check found when it was newer, else null. */
  latest: AvailableUpdate | null;
  /** Not now on this version. */
  dismissedVersion: string | null;
  /** The last file saved; `path` relative to the storage root. */
  downloaded: {version: string; path: string} | null;
}

/** The stored state plus what is going on right now (memory only). */
export interface UpdateSnapshot extends UpdateState {
  busy: 'checking' | 'downloading' | null;
  /** The last check's failure (by hand), until the next check. */
  lastError: string | null;
  /** The last download's outcome, until it is dismissed or the next download starts. */
  lastDownload: UpdateDownloadResult | null;
}

const EMPTY: UpdateState = {lastCheckAt: null, latest: null, dismissedVersion: null, downloaded: null};

let snapshot: UpdateSnapshot = {...EMPTY, busy: null, lastError: null, lastDownload: null};
let loaded: Promise<void> | null = null;
let checking: Promise<UpdateCheckResult> | null = null;
let downloading: Promise<UpdateDownloadResult> | null = null;
let testMode = false;
const listeners = new Set<() => void>();

function publish(patch: Partial<UpdateSnapshot>): void {
  snapshot = {...snapshot, ...patch};
  Array.from(listeners).forEach(l => l());
}

export function getUpdateSnapshot(): UpdateSnapshot {
  return snapshot;
}

export function subscribeUpdates(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reads the stored state once per session (a missing or unreadable entry reads as empty); resolves the current snapshot. */
export async function loadUpdateState(): Promise<UpdateSnapshot> {
  if (!loaded) {
    loaded = (async () => {
      try {
        const raw = await AsyncStorage.getItem(UPDATE_STATE_KEY);
        const stored = raw ? (JSON.parse(raw) as Partial<UpdateState>) : {};
        publish({
          lastCheckAt: typeof stored.lastCheckAt === 'number' ? stored.lastCheckAt : null,
          latest: stored.latest && typeof stored.latest.version === 'string' ? stored.latest : null,
          dismissedVersion: typeof stored.dismissedVersion === 'string' ? stored.dismissedVersion : null,
          downloaded: stored.downloaded && typeof stored.downloaded.path === 'string' ? stored.downloaded : null,
        });
      } catch (e) {
        logWarn('updates: reading the stored state failed', errorMessage(e));
      }
    })();
  }
  await loaded;
  return snapshot;
}

async function store(patch: Partial<UpdateState>): Promise<void> {
  publish(patch);
  const {lastCheckAt, latest, dismissedVersion, downloaded} = snapshot;
  try {
    await AsyncStorage.setItem(UPDATE_STATE_KEY, JSON.stringify({lastCheckAt, latest, dismissedVersion, downloaded}));
  } catch (e) {
    logError('updates: storing the state failed', errorMessage(e));
  }
}

/**
 * "Update test: treat this build as 0.0.0" (design §8): memory only, so it is gone after a
 * restart. While on, the latest real release counts as newer and the daily check is due.
 * Switching it on also forgets when the last check ran, so the daily check runs at the next
 * start too.
 */
export function setUpdateTestMode(on: boolean): void {
  testMode = on;
  log('updates: test mode', on ? 'on' : 'off');
  if (on) {
    store({lastCheckAt: null});
  } else {
    publish({});
  }
}

export function isUpdateTestMode(): boolean {
  return testMode;
}

export function currentRunningVersion(): RunningVersion {
  return testMode ? TEST_RUNNING_VERSION : runningVersion(BUILD_INFO);
}

/** The update to offer: the stored one while it is still newer than this build, else null. */
export function knownUpdate(s: UpdateSnapshot = snapshot): AvailableUpdate | null {
  if (!s.latest) return null;
  try {
    return isNewer(s.latest.version, currentRunningVersion()) ? s.latest : null;
  } catch {
    // silent: a stored version that is no x.y.z is not offered
    return null;
  }
}

/** The check, as it ends; GitHub answered (`lastCheckAt` set) unless the kind says otherwise. */
async function runCheck(silent: boolean): Promise<UpdateCheckResult> {
  const allowed = silent ? await hasPluginPermission(INTERNET_PERMISSION) : await ensureInternetPermission();
  if (!allowed) {
    log('updates: check without internet permission', silent ? '(silent)' : '(by hand)');
    return {kind: 'noPermission'};
  }
  log('updates: checking', silent ? '(silent)' : '(by hand)');
  let response: Response;
  try {
    response = await withTimeout(
      fetch(LATEST_RELEASE_URL, {
        headers: {Accept: 'application/vnd.github+json', 'User-Agent': USER_AGENT, 'X-GitHub-Api-Version': '2022-11-28'},
      }),
      FETCH_TIMEOUT_MS,
      'GitHub did not answer in time',
    );
  } catch (e) {
    logWarn('updates: fetching the latest release failed', errorMessage(e));
    return {kind: 'error'};
  }
  if (response.status === 404) return answered({kind: 'noRelease'});
  if (response.status === 403 || response.status === 429) {
    logWarn('updates: GitHub refused the request', response.status);
    return {kind: 'rateLimited'};
  }
  if (!response.ok) {
    logWarn('updates: GitHub answered', response.status);
    return {kind: 'error'};
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (e) {
    logWarn('updates: the release answer is no JSON', errorMessage(e));
    return {kind: 'error'};
  }
  const parsed = parseLatestRelease(json);
  if (!parsed.ok) {
    logWarn('updates: the latest release is not usable', parsed.reason);
    return answered({kind: 'unusable'});
  }
  const update = parsed.update;
  const newer = isNewer(update.version, currentRunningVersion());
  log('updates: latest release', update.version, newer ? 'is newer' : 'is not newer');
  await store({latest: newer ? update : null});
  return answered(newer ? {kind: 'available', update} : {kind: 'upToDate', version: update.version});
}

async function answered(result: UpdateCheckResult): Promise<UpdateCheckResult> {
  await store({lastCheckAt: Date.now()});
  return result;
}

/**
 * Checks GitHub's latest release. `silent` (the daily check) asks for no permission and
 * shows nothing: without INTERNET it ends with `noPermission` and makes no request. A second
 * call while one runs gets the same promise.
 */
export function checkForUpdate({silent}: {silent: boolean}): Promise<UpdateCheckResult> {
  if (checking) return checking;
  publish({busy: 'checking', lastError: null});
  checking = (async () => {
    await loadUpdateState();
    let result: UpdateCheckResult;
    try {
      result = await runCheck(silent);
    } catch (e) {
      logError('updates: check failed', errorMessage(e));
      result = {kind: 'error'};
    }
    const failed = result.kind !== 'available' && result.kind !== 'upToDate';
    const silentText = result.kind === 'noPermission' ? DAILY_NEEDS_PERMISSION_TEXT : null;
    publish({busy: null, lastError: failed ? (silent ? silentText : checkResultText(result)) : null});
    return result;
  })().finally(() => {
    checking = null;
  });
  return checking;
}

/**
 * Stores the daily-check choice. Switching it on asks for INTERNET once, so the daily check
 * itself never needs a dialog; a refusal keeps the choice (About then says the check needs
 * internet access).
 */
export async function saveUpdateCheckMode(mode: UpdateCheckMode): Promise<void> {
  log('updates: check mode', mode);
  await patchSettings({updateCheck: mode});
  if (mode === 'daily') await ensureInternetPermission();
}

/** The download's message was dismissed. */
export function clearLastDownload(): void {
  publish({lastDownload: null});
}

/** Not now: no notice for this version; the next one shows it again. */
export function dismissUpdate(version: string): Promise<void> {
  log('updates: not now for', version);
  return store({dismissedVersion: version});
}

/** The first free name for this version in the download folder, or the file already saved there. */
async function pickName(update: AvailableUpdate, sha256File: (path: string) => Promise<string>): Promise<{name: string} | {already: string}> {
  for (let attempt = 1; attempt <= MAX_NAME_ATTEMPTS; attempt++) {
    const name = downloadFileName(update.version, attempt);
    const path = `${UPDATE_DOWNLOAD_FOLDER}/${name}`;
    const stat = (await statFiles([path]))?.[0];
    if (!stat) throw new Error('statFiles is not available');
    if (!stat.exists) return {name};
    if (stat.size === update.asset.size && (await sha256File(path)) === update.asset.sha256) return {already: path};
  }
  throw new Error(`no free name after ${MAX_NAME_ATTEMPTS} attempts`);
}

async function runDownload(update: AvailableUpdate): Promise<UpdateDownloadResult> {
  const native = getKeptUpdateNative();
  if (!native) {
    logWarn('updates: KeptUpdate native module is not in this build');
    return {kind: 'notSupported'};
  }
  if (!(await ensureInternetPermission()) || !(await ensureFileWritePermission())) {
    log('updates: download without permission');
    return {kind: 'noPermission'};
  }
  await ensureFolderExists(UPDATE_DOWNLOAD_FOLDER);
  const picked = await pickName(update, path => native.sha256File(path));
  if ('already' in picked) {
    log('updates: already downloaded', update.version);
    const path = displayPath(picked.already);
    await store({downloaded: {version: update.version, path}});
    return {kind: 'already', path};
  }
  const tmpName = `update-${assetName(update.version)}`;
  const tmpPath = `${await getPrivateTempDir()}/${tmpName}`;
  try {
    log('updates: downloading', update.version, `${update.asset.size} bytes`);
    const file = await native.download(update.asset.url, tmpName, MAX_ASSET_BYTES, USER_AGENT);
    if (file.size !== update.asset.size || file.sha256 !== update.asset.sha256) {
      logWarn('updates: download does not match the release', `${file.size} of ${update.asset.size} bytes`);
      return {kind: 'mismatch'};
    }
    const saved = await native.copyIntoFolder(file.path, UPDATE_DOWNLOAD_FOLDER, picked.name);
    notifyFolderChanged(UPDATE_DOWNLOAD_FOLDER);
    const path = displayPath(saved);
    log('updates: saved', update.version);
    await store({downloaded: {version: update.version, path}});
    return {kind: 'saved', path};
  } finally {
    await deleteTempTree(tmpPath);
  }
}

/**
 * Downloads `update` into MyStyle/kept-gtd/: into the private temp folder first, checked
 * against the release's size and SHA-256, then copied under the first free name. A file of
 * this version already there with the same content is reported, not downloaded again. A
 * second call while one runs gets the same promise.
 */
export function downloadUpdate(update: AvailableUpdate): Promise<UpdateDownloadResult> {
  if (downloading) return downloading;
  publish({busy: 'downloading', lastDownload: null});
  downloading = (async () => {
    let result: UpdateDownloadResult;
    try {
      result = await runDownload(update);
    } catch (e) {
      logError('updates: download failed', errorMessage(e));
      result = {kind: 'error'};
    }
    publish({busy: null, lastDownload: result});
    return result;
  })().finally(() => {
    downloading = null;
  });
  return downloading;
}

/** For tests: forget everything held in memory. */
export function resetUpdatesForTests(): void {
  snapshot = {...EMPTY, busy: null, lastError: null, lastDownload: null};
  loaded = null;
  checking = null;
  downloading = null;
  testMode = false;
  listeners.clear();
}

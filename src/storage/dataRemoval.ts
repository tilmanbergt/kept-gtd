/**
 * Remove Kept's data (docs/dev/history/technical-design-remove-data.md §4): finds what Kept has
 * put on the device (`scanRemoval`) and removes what the user picked (`runRemoval`). The rules
 * and texts are in domain/dataRemoval.ts; the native side refuses every delete outside Kept's own
 * folders and data files (GtdParaFileModule.kt's deleteKeptTree / deleteKeptFile).
 *
 * The log gets counts only: paths can hold project names.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEMO_BASE_ROOT, DEMO_PROFILE_ID} from '../domain/demoSpace';
import {RemovalCounts, RemovalInventory, RemovalStep, StepOutcome, outcomeLogLine} from '../domain/dataRemoval';
import {writeTempPathFor} from '../domain/fileName';
import {resolvePaths} from '../domain/settings';
import {AREA_FILE_NAME, PROJECT_FILE_NAME} from '../domain/types';
import {DEBUG_LOG_FOLDER_PATH, GTDPARA_EXPORT_ROOT, INTERNAL_STORAGE, PROFILES_FOLDER_PATH} from '../supernote/devicePaths';
import {deleteKeptFile, deleteKeptTree, deletePrivateDataTree, deleteTempTree, getPrivateDataDir, getPrivateTempDir, listFolderEntries, statFiles} from '../supernote/fileSystem';
import {ensureFileDeletePermission} from '../supernote/pluginPermissions';
import {errorMessage} from '../utils/errorMessage';
import {log, logWarn} from '../utils/log';
import {flushLogFile, setFileLogging} from '../utils/logSink';
import {perfEnable} from '../utils/perf';
import {LEGACY_EXPORT_ROOT, saveActiveProfile} from './profiles';
import {loadSettings} from './settingsStorage';

/** Every key Kept writes into the host's store starts with this; other plugins' keys never do. */
export const STORE_PREFIX = 'gtdpara:';
export const SETTINGS_STORE_KEY = 'gtdpara:settings:v1';
export const SECRETS_STORE_KEY = 'gtdpara:profileSecrets:v1';
export const LEGACY_DEMO_ROOT = `${INTERNAL_STORAGE}/Note/gtdpara-demo`;
export const DEMO_PROFILE_FILE = `${PROFILES_FOLDER_PATH}/${DEMO_PROFILE_ID}.json`;
/** Deep enough for `4 Archive/<year>/<area>/<project>/project.txt`. */
const ARCHIVE_DEPTH = 4;
const TREE_DEPTH = 12;

/** What `runRemoval` acts on, beside the counts the screen shows. */
export interface RemovalTargets {
  /** Kept's keys in the host store, by what they hold. */
  storeKeys: {settings: string[]; secrets: string[]; caches: string[]; demo: string[]};
  privateFolders: {data: string | null; tmp: string | null};
  dataFiles: string[];
  saveCopies: string[];
}

export interface RemovalScan {
  inventory: RemovalInventory;
  targets: RemovalTargets;
}

/** A folder's entries, or none when it is missing or can't be read (logged). */
async function listOrEmpty(path: string) {
  try {
    return await listFolderEntries(path);
  } catch (e) {
    logWarn('dataRemoval: a listing failed', errorMessage(e));
    return [];
  }
}

/** A private folder's path, or null when this build can't name it (logged). */
async function privateDir(get: () => Promise<string>): Promise<string | null> {
  try {
    return await get();
  } catch (e) {
    logWarn('dataRemoval: a private folder is not available', errorMessage(e));
    return null;
  }
}

/** The files in `root` and below it (none when it is missing or unreadable). */
async function filesIn(root: string, depth = TREE_DEPTH): Promise<string[]> {
  const entries = await listOrEmpty(root);
  const files: string[] = [];
  for (const e of entries) {
    if (!e.isFolder) files.push(e.path);
    else if (depth > 0) files.push(...(await filesIn(e.path, depth - 1)));
  }
  return files;
}

/** `project.txt` / `area.txt` of each folder in `root` (one level). */
async function dataFilesOneLevel(root: string, name: string): Promise<string[]> {
  const found: string[] = [];
  for (const folder of (await listOrEmpty(root)).filter(e => e.isFolder)) {
    if ((await listOrEmpty(folder.path)).some(e => !e.isFolder && e.name === name)) found.push(`${folder.path}/${name}`);
  }
  return found;
}

/** Every `project.txt` and `area.txt` in the Archive, whatever its year and area folders. */
async function archiveDataFiles(root: string, depth: number): Promise<string[]> {
  const entries = await listOrEmpty(root);
  const found = entries.filter(e => !e.isFolder && (e.name === PROJECT_FILE_NAME || e.name === AREA_FILE_NAME)).map(e => e.path);
  if (depth > 0) for (const folder of entries.filter(e => e.isFolder)) found.push(...(await archiveDataFiles(folder.path, depth - 1)));
  return found;
}

async function existing(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const stats = await statFiles(paths);
  return stats ? stats.filter(s => s.exists).map(s => s.path) : [];
}

async function storeTargets(): Promise<{keys: RemovalTargets['storeKeys']; secretProfiles: number}> {
  const all = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(STORE_PREFIX));
  let secretProfiles = 0;
  if (all.includes(SECRETS_STORE_KEY)) {
    try {
      secretProfiles = Object.keys(JSON.parse((await AsyncStorage.getItem(SECRETS_STORE_KEY)) ?? '{}')).length;
    } catch {
      // silent: an unreadable secrets entry still counts as one, so it is offered for removal.
      secretProfiles = 1;
    }
  }
  return {
    keys: {
      settings: all.filter(key => key === SETTINGS_STORE_KEY),
      secrets: all.filter(key => key === SECRETS_STORE_KEY),
      caches: all.filter(key => key !== SETTINGS_STORE_KEY && key !== SECRETS_STORE_KEY),
      demo: all.filter(key => key.endsWith(`:${DEMO_PROFILE_ID}`)),
    },
    secretProfiles,
  };
}

/** Lists and counts everything of §3; reads only. */
export async function scanRemoval(): Promise<RemovalScan> {
  const settings = await loadSettings();
  const paths = resolvePaths(settings);
  const store = await storeTargets();

  const dataDir = await privateDir(getPrivateDataDir);
  const tmpDir = await privateDir(getPrivateTempDir);
  const privateFolders = {data: dataDir, tmp: tmpDir};
  const privateFiles = [...(dataDir ? await filesIn(dataDir) : []), ...(tmpDir ? await filesIn(tmpDir) : [])];
  const openMarks = dataDir ? (await listOrEmpty(`${dataDir}/marks`)).filter(e => e.isFolder).length : 0;

  const dataFiles = [
    ...(await dataFilesOneLevel(paths.projects, PROJECT_FILE_NAME)),
    ...(await dataFilesOneLevel(paths.areas, AREA_FILE_NAME)),
    ...(await existing([paths.inbox])),
    ...(await archiveDataFiles(paths.archive, ARCHIVE_DEPTH)),
  ];
  const saveCopies = await existing(dataFiles.map(writeTempPathFor));

  const profiles = await filesIn(PROFILES_FOLDER_PATH, 0);
  const demoFiles = [...(await filesIn(DEMO_BASE_ROOT)), ...profiles.filter(p => p === DEMO_PROFILE_FILE)];
  const counts: RemovalCounts = {
    settings: store.keys.settings.length,
    secrets: store.secretProfiles,
    caches: store.keys.caches.length,
    privateData: privateFiles.length,
    logs: (await filesIn(DEBUG_LOG_FOLDER_PATH)).length,
    demo: demoFiles.length,
    legacy: (await filesIn(LEGACY_EXPORT_ROOT)).length + (await filesIn(LEGACY_DEMO_ROOT)).length,
    saveCopies: saveCopies.length,
    dataFiles: dataFiles.length,
    profiles: profiles.length,
  };
  log('dataRemoval: scanned', Object.entries(counts).map(([kind, n]) => `${kind} ${n}`).join(', '), `open marks ${openMarks}`);
  return {
    inventory: {counts, openMarks, demoProfileActive: settings.activeProfileId === DEMO_PROFILE_ID},
    targets: {storeKeys: store.keys, privateFolders, dataFiles, saveCopies},
  };
}


/** Deletes each target, counting what went; the first error is kept, the rest still tried. */
async function eachTarget(step: RemovalStep, targets: string[], remove: (target: string) => Promise<unknown>): Promise<StepOutcome> {
  let done = 0;
  let error: string | undefined;
  for (const target of targets) {
    try {
      await remove(target);
      done++;
    } catch (e) {
      error = error ?? errorMessage(e).replace(/\/storage\/\S+/g, '…');
    }
  }
  return {step, done, total: targets.length, error};
}

async function removeStoreKeys(step: RemovalStep, keys: string[]): Promise<StepOutcome> {
  try {
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    return {step, done: keys.length, total: keys.length};
  } catch (e) {
    return {step, done: 0, total: keys.length, error: errorMessage(e)};
  }
}

/** Removes the demo profile's entry from the secrets map, keeping the other profiles'. */
async function removeDemoSecrets(): Promise<void> {
  const raw = await AsyncStorage.getItem(SECRETS_STORE_KEY);
  if (!raw) return;
  const map = JSON.parse(raw) as Record<string, unknown>;
  if (!(DEMO_PROFILE_ID in map)) return;
  delete map[DEMO_PROFILE_ID];
  await AsyncStorage.setItem(SECRETS_STORE_KEY, JSON.stringify(map));
}

async function runStep(step: RemovalStep, targets: RemovalTargets): Promise<StepOutcome> {
  switch (step) {
    case 'saveProfile':
      try {
        await saveActiveProfile();
        return {step, done: 1, total: 1};
      } catch (e) {
        return {step, done: 0, total: 1, error: errorMessage(e)};
      }
    case 'legacy':
      return eachTarget(step, [LEGACY_EXPORT_ROOT, LEGACY_DEMO_ROOT], deleteKeptTree);
    case 'demo': {
      const files = await eachTarget(step, [DEMO_BASE_ROOT, DEMO_PROFILE_FILE], deleteKeptTree);
      const store = await removeStoreKeys(step, targets.storeKeys.demo);
      try {
        await removeDemoSecrets();
      } catch (e) {
        return {...files, error: files.error ?? errorMessage(e)};
      }
      return {...files, error: files.error ?? store.error};
    }
    case 'logs':
      return eachTarget(step, [DEBUG_LOG_FOLDER_PATH], deleteKeptTree);
    case 'saveCopies':
      return eachTarget(step, targets.saveCopies, deleteKeptFile);
    case 'dataFiles':
      return eachTarget(step, targets.dataFiles, deleteKeptFile);
    case 'profiles':
      return eachTarget(step, [PROFILES_FOLDER_PATH], deleteKeptTree);
    case 'privateData': {
      // The contents of data/ and tmp/ - never the private folder itself, which holds the plugin.
      const [dataDir, tmpDir] = [targets.privateFolders.data, targets.privateFolders.tmp];
      const inData = dataDir ? (await listOrEmpty(dataDir)).map(e => e.path) : [];
      const inTmp = tmpDir ? (await listOrEmpty(tmpDir)).map(e => e.path) : [];
      const data = await eachTarget(step, inData, async path => {
        if (!(await deletePrivateDataTree(path))) throw new Error('could not delete a file in the private folder');
      });
      const tmp = await eachTarget(step, inTmp, deleteTempTree);
      return {step, done: data.done + tmp.done, total: data.total + tmp.total, error: data.error ?? tmp.error};
    }
    case 'caches':
      return removeStoreKeys(step, targets.storeKeys.caches);
    case 'secrets':
      return removeStoreKeys(step, targets.storeKeys.secrets);
    case 'settings':
      return removeStoreKeys(step, targets.storeKeys.settings);
  }
}

/** Kept's export folder itself, once both its debug and profiles folders are gone. */
async function removeEmptyExportRoot(): Promise<void> {
  try {
    if ((await listFolderEntries(GTDPARA_EXPORT_ROOT)).length === 0) await deleteKeptTree(GTDPARA_EXPORT_ROOT);
  } catch (e) {
    logWarn('dataRemoval: removing the empty export folder failed', errorMessage(e));
  }
}

/**
 * Runs `plan` in its order (domain/dataRemoval.ts's planRemoval, R6), after one FILE:DELETE
 * request naming what goes. File logging and performance tracing stop first (R9), so neither
 * writes into the folder being removed. Resolves to one outcome per step; a refused permission
 * fails the file steps and leaves the store untouched.
 */
export async function runRemoval(plan: RemovalStep[], targets: RemovalTargets, reason: string, onStep?: (outcome: StepOutcome) => void): Promise<StepOutcome[]> {
  setFileLogging(false);
  perfEnable(false);
  try {
    await flushLogFile();
  } catch (e) {
    logWarn('dataRemoval: flushing the log file failed', errorMessage(e));
  }
  const needsDelete = plan.some(step => ['legacy', 'demo', 'logs', 'saveCopies', 'dataFiles', 'profiles'].includes(step));
  if (needsDelete && !(await ensureFileDeletePermission(reason))) {
    log('dataRemoval: delete permission not granted, nothing removed');
    const refused = plan.map(step => ({step, done: 0, total: 0, error: 'the Supernote did not allow deleting files'}));
    refused.forEach(o => onStep?.(o));
    return refused;
  }
  const outcomes: StepOutcome[] = [];
  for (const step of plan) {
    // The settings say where the folders are: they stay while anything before them failed.
    const failedBefore = outcomes.some(o => o.error);
    const outcome: StepOutcome = step === 'settings' && failedBefore ? {step, done: 0, total: 1, skipped: true} : await runStep(step, targets);
    log('dataRemoval:', outcomeLogLine(outcome));
    outcomes.push(outcome);
    onStep?.(outcome);
  }
  if (plan.includes('logs') || plan.includes('profiles')) await removeEmptyExportRoot();
  return outcomes;
}

export type StepOutcomeList = StepOutcome[];

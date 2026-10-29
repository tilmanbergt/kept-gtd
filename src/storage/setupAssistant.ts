/**
 * The setup assistant's reads and writes (docs/dev/history/technical-design-easy-start.md §5.3-5.4):
 * one look at the base folder (its folders and how many subfolders each has),
 * and Finish - the choices saved through the normal save path (refused while
 * the stored settings are unreadable), then only the missing folders created.
 * Nothing is moved, renamed or deleted. Logs counts only.
 */
import {FinishPlan, RootEntry} from '../domain/setupAssistant';
import {GtdParaSettings, resolvePaths} from '../domain/settings';
import {ensureFolderExists, listFolderEntries} from '../supernote/fileSystem';
import {errorMessage} from '../utils/errorMessage';
import {log, logError, logWarn} from '../utils/log';
import {clearCachedData} from './dataCache';
import {patchSettings} from './settingsStorage';

export interface BaseScan {
  entries: RootEntry[];
  /** Subfolders per folder of the base folder, by name. */
  childCounts: Record<string, number>;
}

/** The base folder's entries and each folder's subfolder count; a missing base folder reads as empty. */
export async function scanBaseFolder(baseRoot: string): Promise<BaseScan> {
  const listed = await listFolderEntries(baseRoot);
  const entries = listed.map(e => ({name: e.name, isFolder: e.isFolder}));
  const childCounts: Record<string, number> = {};
  for (const folder of listed.filter(e => e.isFolder && !e.name.startsWith('.'))) {
    try {
      childCounts[folder.name] = (await listFolderEntries(folder.path)).filter(e => e.isFolder).length;
    } catch (e) {
      logWarn('setupAssistant: counting subfolders failed', errorMessage(e));
      childCounts[folder.name] = 0;
    }
  }
  log('setupAssistant: base scanned', `${entries.filter(e => e.isFolder).length} folders`);
  return {entries, childCounts};
}

export interface FinishResult {
  created: string[];
  failed: string[];
  /** The base folder the folders were created in. */
  base: string;
  /** The settings as saved. */
  settings: GtdParaSettings;
}

/** Saves the plan's settings, then creates its missing folders in order. A save that fails throws and creates nothing. */
export async function finishSetup(plan: FinishPlan): Promise<FinishResult> {
  const saved = await patchSettings(plan.settingsPatch);
  // The cache was built for the folders before.
  clearCachedData();
  const base = resolvePaths(saved).base;
  const created: string[] = [];
  const failed: string[] = [];
  for (const name of plan.foldersToCreate) {
    try {
      await ensureFolderExists(`${base}/${name}`);
      created.push(name);
    } catch (e) {
      logError('setupAssistant: creating a folder failed', errorMessage(e));
      failed.push(name);
    }
  }
  log('setupAssistant: finished', `created ${created.length}`, `failed ${failed.length}`);
  return {created, failed, base, settings: saved};
}

/** Skip: the assistant is done, nothing else is saved or created. */
export async function skipSetup(): Promise<void> {
  await patchSettings({setupAssistant: 'done'});
  log('setupAssistant: skipped');
}

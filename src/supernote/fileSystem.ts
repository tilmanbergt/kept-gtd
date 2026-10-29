import {PluginFileAPI} from 'sn-plugin-lib';
import {ensureFileDeletePermission, ensureFileReadPermission, ensureFileWritePermission, forgetPermissionGrants, logFileCallFailure} from './pluginPermissions';
import {log, logError, logWarn} from '../utils/log';
import {perfEnd, perfStart} from '../utils/perf';
import {errorMessage} from '../utils/errorMessage';
import {recordDebugLogEntry} from './hostCall';
import {nativeFileModule, notifyFolderChanged, parentFolder} from './fileNative';
import {SdkResponse} from './sdkElements';

// The folder-change listeners live with the native binding (fileNative.ts, internal); this is their public face.
export {subscribeFolderChanges} from './fileNative';

export interface FolderEntry {
  name: string;
  path: string;
  isFolder: boolean;
}

const GtdParaFile = nativeFileModule();

/**
 * Lists one folder level via the native GtdParaFile module. Resolves to an
 * empty array if the folder doesn't exist yet (rather than throwing), since
 * "not created yet" is an expected state for a Project/Area root, not an
 * error condition.
 */
export async function listFolderEntries(folderPath: string): Promise<FolderEntry[]> {
  if (!GtdParaFile) {
    logError('listFolderEntries: GtdParaFile native module is not registered');
    throw new Error('GtdParaFile native module is not available on this build.');
  }
  if (!(await ensureFileReadPermission())) {
    logError('listFolderEntries: file read permission not granted', folderPath);
    throw new Error('File read permission was not granted.');
  }
  log('listFolderEntries: start', folderPath);
  const perfToken = perfStart();
  try {
    const entries = await GtdParaFile.listFolderEntries(folderPath);
    perfEnd('io:list', perfToken, {path: folderPath, entries: entries.length});
    log('listFolderEntries: done', folderPath, `${entries.length} entries`);
    return entries;
  } catch (e) {
    logFileCallFailure('listFolderEntries: failed', folderPath, errorMessage(e));
    throw e;
  }
}

/** Last-modified time (ms) and size (bytes) of one path; a missing path has exists=false, lastModified=0, size=-1. */
export interface FileStat {
  path: string;
  exists: boolean;
  lastModified: number;
  size: number;
}

/**
 * Stats many files in ONE native call (docs/dev/history/technical-design-files-0.6.md
 * §3.1) - what storage/dataCache.ts's refreshCache uses to see which data
 * files changed since they were read. Resolves `null` on a native build that
 * doesn't have the call yet, so the caller can fall back to a full re-read.
 */
export async function statFiles(paths: string[]): Promise<FileStat[] | null> {
  if (!GtdParaFile?.statFiles) {
    logWarn('statFiles: not available on this native build');
    return null;
  }
  if (!(await ensureFileReadPermission())) {
    logError('statFiles: file read permission not granted');
    throw new Error('File read permission was not granted.');
  }
  const perfToken = perfStart();
  try {
    const stats = await GtdParaFile.statFiles(paths);
    perfEnd('io:stat', perfToken, {files: paths.length});
    return stats;
  } catch (e) {
    logFileCallFailure('statFiles: failed', `${paths.length} paths`, errorMessage(e));
    throw e;
  }
}

/**
 * Whether a FILE (not a folder) exists at exactly this absolute path.
 * Implemented via `listFolderEntries` on the parent folder rather than a
 * dedicated host existence call - the SDK exposes none - which also means
 * this inherits `listFolderEntries`'s own "missing parent folder resolves
 * to `[]`, not a throw" behavior, so a path under a folder that doesn't
 * exist at all correctly comes back `false` rather than erroring.
 *
 * Used by `storage/noteLinks.ts`'s `resolveNotePath`, to verify a
 * `parseSharedNoteAnchor` guess actually resolves to a real file before
 * trusting it over the plain reading, and `storage/integrityCheck.ts`'s
 * `hashNotePath` check, to tell a genuinely broken/orphaned notePath apart
 * from one that `resolveNotePath`'s fallback already handles fine.
 */
export async function fileExists(path: string): Promise<boolean> {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash < 0) return false;
  const parent = path.slice(0, lastSlash);
  const name = path.slice(lastSlash + 1);
  const entries = await listFolderEntries(parent);
  return entries.some(e => !e.isFolder && e.name === name);
}

/**
 * Same idea as fileExists, but for a folder (e.g. a Project/Area's
 * `defaultResourceFolder`, which names a Resources subfolder, not a file) -
 * lists the parent and looks for a matching entry with isFolder true instead
 * of false. Used by domain/integrityCheck.ts's defaultResourceFolderMissing
 * check ([[feature_integrity_check]]).
 */
export async function folderExists(path: string): Promise<boolean> {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash < 0) return false;
  const parent = path.slice(0, lastSlash);
  const name = path.slice(lastSlash + 1);
  const entries = await listFolderEntries(parent);
  return entries.some(e => e.isFolder && e.name === name);
}

/**
 * Opens a file (a Supernote .note, a PDF, anything the host recognizes) via
 * the official PluginFileAPI.openFile call — no custom native module needed
 * for this, unlike listFolderEntries. `page: -1` keeps whatever page the
 * host last had open for that file rather than jumping anywhere specific;
 * jumping to a *particular* page (e.g. a logged meeting occurrence) is a
 * separate, later concern that would pass a real page index instead.
 */
export async function openPath(path: string, page = -1): Promise<void> {
  const granted = await ensureFileReadPermission();
  if (!granted) {
    logError('openPath: file read permission not granted', path);
    throw new Error('File read permission was not granted.');
  }
  log('openPath: start', path, `page=${page}`);
  const start = Date.now();
  // Told *before* the host call, not after: once openFile succeeds the host
  // may hide/freeze the plugin at once, so this is the last moment we're
  // guaranteed to run. The observer's rollback (if any) undoes its
  // bookkeeping when the open then fails.
  const rollback = openPathObserver?.onOpening(path);
  let response: SdkResponse<unknown> | null | undefined;
  try {
    response = (await PluginFileAPI.openFile(path, page)) as typeof response;
  } catch (e) {
    rollback?.();
    forgetPermissionGrants();
    // Diagnostic - see getElements' own comment (this file) for why. A thrown (not just
    // unsuccessful) openFile call gets its own entry too, with the exception's own message.
    await recordDebugLogEntry('openPath', false, Date.now() - start, {
      path,
      page,
      errorMessage: errorMessage(e),
    });
    throw e;
  }
  const durationMs = Date.now() - start;
  if (!response || !response.success) {
    rollback?.();
    const message = response?.error?.message || 'Could not open this file.';
    logFileCallFailure('openPath: failed', path, message);
    await recordDebugLogEntry('openPath', false, durationMs, {path, page, errorMessage: message});
    throw new Error(message);
  }
  log('openPath: done', path);
  await recordDebugLogEntry('openPath', true, durationMs, {path, page});
}

/**
 * Hook letting the app layer learn about every file the plugin opens
 * itself, without this module importing anything from storage/ or App.tsx
 * (storage/ already imports supernote/, never the other way round). Used by
 * App.tsx to feed storage/returnRecord.ts - docs/dev/technical-design-return-to-
 * origin.md §6. Every in-plugin open already funnels through openPath, so
 * no call site needs to change.
 */
export interface OpenPathObserver {
  /** Called after the read-permission check, immediately before PluginFileAPI.openFile. May return a function that undoes whatever it recorded, called if the host then fails to open the file. */
  onOpening(path: string): (() => void) | void;
}

let openPathObserver: OpenPathObserver | null = null;

/** Registers (or, with null, removes) the single observer openPath() notifies. */
export function setOpenPathObserver(observer: OpenPathObserver | null): void {
  openPathObserver = observer;
}

/**
 * Reads a whole text file (a project.txt/area.txt). Resolves `null` when
 * the file doesn't exist yet, same "not created yet, not an error" stance
 * as listFolderEntries - a Project/Area with no todos or meetings added
 * yet simply has no data file.
 */
export async function readTextFile(path: string): Promise<string | null> {
  if (!GtdParaFile) {
    logError('readTextFile: GtdParaFile native module is not registered');
    throw new Error('GtdParaFile native module is not available on this build.');
  }
  const granted = await ensureFileReadPermission();
  if (!granted) {
    logError('readTextFile: file read permission not granted', path);
    throw new Error('File read permission was not granted.');
  }
  log('readTextFile: start', path);
  const perfToken = perfStart();
  try {
    const content = await GtdParaFile.readTextFile(path);
    perfEnd('io:read', perfToken, {path, chars: content == null ? null : content.length});
    log('readTextFile: done', path, content == null ? 'missing' : `${content.length} chars`);
    return content;
  } catch (e) {
    logFileCallFailure('readTextFile: failed', path, errorMessage(e));
    throw e;
  }
}

/**
 * Overwrites a whole text file (creating it, and any missing parent
 * folders, if needed) with the *entire* new content. The native side replaces it atomically
 * (domain/fileName.ts's writeTempPathFor) or, when that fails, writes directly ('direct', warned).
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  if (!GtdParaFile) {
    logError('writeTextFile: GtdParaFile native module is not registered');
    throw new Error('GtdParaFile native module is not available on this build.');
  }
  const granted = await ensureFileWritePermission();
  if (!granted) {
    logError('writeTextFile: file write permission not granted', path);
    throw new Error('File write permission was not granted.');
  }
  log('writeTextFile: start', path, `${content.length} chars`);
  try {
    const how = await GtdParaFile.writeTextFile(path, content);
    (how === 'direct' ? logWarn : log)('writeTextFile: done', how, path);
  } catch (e) {
    logFileCallFailure('writeTextFile: failed', path, errorMessage(e));
    throw e;
  }
}

/**
 * Creates `path` as a folder (and any missing parents) if it doesn't exist
 * yet. Used before creating a linked note in a Project/Area's "Meetings"/
 * "Todos" subfolder, since PluginFileAPI.createNote's own folder-creation
 * behavior for a brand-new destination folder isn't documented.
 */
export async function ensureFolderExists(path: string): Promise<void> {
  if (!GtdParaFile) {
    logError('ensureFolderExists: GtdParaFile native module is not registered');
    throw new Error('GtdParaFile native module is not available on this build.');
  }
  const granted = await ensureFileWritePermission();
  if (!granted) {
    logError('ensureFolderExists: file write permission not granted', path);
    throw new Error('File write permission was not granted.');
  }
  log('ensureFolderExists: start', path);
  try {
    await GtdParaFile.ensureFolder(path);
    log('ensureFolderExists: done', path);
  } catch (e) {
    logFileCallFailure('ensureFolderExists: failed', path, errorMessage(e));
    throw e;
  }
}

/**
 * Writes `base64Content` (already-encoded bytes, e.g. a Gmail attachment
 * fetched via gmailImapNative.ts's fetchAttachment) to `path`, creating any
 * missing parent folders first - the binary counterpart of writeTextFile
 * above. Used by storage/gmailAttachments.ts's saveGmailAttachment:
 * PluginFileAPI has no generic binary-file write (only .note pages/
 * elements), and writeTextFile's own native implementation is text-only, so
 * this is a plain File.* operation in the plugin's own native module (as
 * moveFolder is for Archive).
 */
export async function writeBinaryFile(path: string, base64Content: string): Promise<void> {
  if (!GtdParaFile) {
    logError('writeBinaryFile: GtdParaFile native module is not registered');
    throw new Error('GtdParaFile native module is not available on this build.');
  }
  const granted = await ensureFileWritePermission();
  if (!granted) {
    logError('writeBinaryFile: file write permission not granted', path);
    throw new Error('File write permission was not granted.');
  }
  log('writeBinaryFile: start', path, `${base64Content.length} base64 chars`);
  try {
    await GtdParaFile.writeBinaryFile(path, base64Content);
    log('writeBinaryFile: done', path);
    notifyFolderChanged(parentFolder(path));
  } catch (e) {
    logFileCallFailure('writeBinaryFile: failed', path, errorMessage(e));
    throw e;
  }
}

/**
 * Moves a Project/Area folder from `fromPath` to `toPath` - the physical
 * half of archiving (storage/archive.ts's archiveItem). Backed by the
 * native module's own `moveFolder` (a plain `File.renameTo()` - same
 * storage volume, atomic, no third-party SDK involved), not
 * `PluginFileAPI`. Rejects rather than silently no-oping if the native
 * side reports `false`: the caller treats a resolved call as proof the
 * folder is really gone from its old location, so a swallowed failure here
 * would leave the app believing an archive succeeded when nothing moved.
 */
export async function moveFolder(fromPath: string, toPath: string): Promise<void> {
  if (!GtdParaFile) {
    logError('moveFolder: GtdParaFile native module is not registered');
    throw new Error('GtdParaFile native module is not available on this build.');
  }
  const granted = await ensureFileWritePermission();
  if (!granted) {
    logError('moveFolder: file write permission not granted', fromPath, toPath);
    throw new Error('File write permission was not granted.');
  }
  log('moveFolder: start', fromPath, '->', toPath);
  try {
    await GtdParaFile.moveFolder(fromPath, toPath);
    log('moveFolder: done', fromPath, '->', toPath);
    notifyFolderChanged(parentFolder(fromPath), parentFolder(toPath), fromPath);
  } catch (e) {
    logFileCallFailure('moveFolder: failed', fromPath, '->', toPath, errorMessage(e));
    throw e;
  }
}

/**
 * Moves one FILE (docs/dev/history/technical-design-project-close-out.md §2.2 - outcome
 * moves and the project PDF). Never overwrites: rejects if `toPath` exists.
 * Missing parent folders are created. Same permission/logging shape as
 * moveFolder.
 */
export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  if (!GtdParaFile) throw new Error('GtdParaFile native module is not available on this build.');
  if (!(await ensureFileWritePermission())) throw new Error('File write permission was not granted.');
  log('moveFile: start', fromPath, '->', toPath);
  try {
    await GtdParaFile.moveFile(fromPath, toPath);
    log('moveFile: done', fromPath, '->', toPath);
    notifyFolderChanged(parentFolder(fromPath), parentFolder(toPath));
  } catch (e) {
    logFileCallFailure('moveFile: failed', fromPath, '->', toPath, errorMessage(e));
    throw e;
  }
}

/**
 * Like moveFolder, but merges into `toPath` when it already exists (Area
 * archive into Archive/<year>/<Area>/, which may already hold archived
 * projects - close-out design §2.2). Rejects before moving anything if any
 * top-level name collides.
 */
export async function moveFolderMerge(fromPath: string, toPath: string): Promise<void> {
  if (!GtdParaFile) throw new Error('GtdParaFile native module is not available on this build.');
  if (!(await ensureFileWritePermission())) throw new Error('File write permission was not granted.');
  log('moveFolderMerge: start', fromPath, '->', toPath);
  try {
    await GtdParaFile.moveFolderMerge(fromPath, toPath);
    log('moveFolderMerge: done', fromPath, '->', toPath);
    notifyFolderChanged(parentFolder(fromPath), toPath, fromPath);
  } catch (e) {
    logFileCallFailure('moveFolderMerge: failed', fromPath, '->', toPath, errorMessage(e));
    throw e;
  }
}

let privateTempDir: string | null = null;

/**
 * gtdpara's temp folder inside the plugin's PRIVATE folder
 * (`.../files/plugins/<pluginID>/tmp`) - exempt from every plugin
 * permission and never visible in the user's file manager
 * (docs/dev/history/technical-design-inkhub-submission.md §3.2). Rendered PDF pages
 * live here, never under Note.
 */
export async function getPrivateTempDir(): Promise<string> {
  if (privateTempDir) return privateTempDir;
  if (!GtdParaFile?.getPrivateTempDir) throw new Error('getPrivateTempDir is not available on this build.');
  privateTempDir = await GtdParaFile.getPrivateTempDir();
  log('getPrivateTempDir:', privateTempDir);
  return privateTempDir;
}

/**
 * Recursively deletes a folder inside gtdpara's PRIVATE temp folder. The
 * native side refuses any path outside it, so this can never reach user
 * files and needs no permission. Never throws - leftover temp files are
 * harmless and must not turn into a user-facing failure.
 */
export async function deleteTempTree(path: string): Promise<void> {
  if (!GtdParaFile) return;
  try {
    await GtdParaFile.deleteTempTree(path);
  } catch (e) {
    logError('deleteTempTree: failed', path, errorMessage(e));
  }
}

let privateDataDir: string | null = null;

/**
 * gtdpara's own data folder inside the plugin's PRIVATE folder
 * (`.../files/plugins/<pluginID>/data`) - unlike the temp folder it is not
 * cleared on start. Holds the picture and stroke data of open "Mark for
 * later" marks (docs/dev/history/technical-design-lasso-0.8.md §3.3). Like the temp
 * folder it needs no permission and isn't visible in the file manager.
 */
export async function getPrivateDataDir(): Promise<string> {
  if (privateDataDir) return privateDataDir;
  if (!GtdParaFile?.getPrivateDataDir) throw new Error('getPrivateDataDir is not available on this build.');
  privateDataDir = await GtdParaFile.getPrivateDataDir();
  log('getPrivateDataDir:', privateDataDir);
  return privateDataDir;
}

/**
 * Recursively deletes a folder inside gtdpara's PRIVATE data folder (a
 * processed mark's data). The native side refuses any path outside it.
 * Never throws: leftover data is harmless and is cleaned up later.
 */
export async function deletePrivateDataTree(path: string): Promise<boolean> {
  if (!GtdParaFile?.deletePrivateDataTree) return false;
  try {
    return await GtdParaFile.deletePrivateDataTree(path);
  } catch (e) {
    logError('deletePrivateDataTree: failed', path, errorMessage(e));
    return false;
  }
}

/**
 * Deletes an EMPTY folder in shared storage. Only call this after the user
 * confirmed it (storage/deletions.ts's deleteEmptyFoldersConfirmed does
 * both): it requests FILE:DELETE with `reason` - a text naming what will be
 * deleted - and the native side refuses anything that isn't an empty folder.
 * Returns false (and logs) when the permission is refused or the folder is
 * not empty; throws only when the native call itself fails.
 */
export async function deleteEmptyFolder(path: string, reason: string): Promise<boolean> {
  if (!GtdParaFile?.deleteEmptyFolder) throw new Error('deleteEmptyFolder is not available on this build.');
  if (!(await ensureFileDeletePermission(reason))) {
    log('deleteEmptyFolder: delete permission not granted, folder kept', path);
    return false;
  }
  try {
    await GtdParaFile.deleteEmptyFolder(path);
    log('deleteEmptyFolder: done', path);
    notifyFolderChanged(parentFolder(path));
    return true;
  } catch (e) {
    const code = (e as {code?: string} | null)?.code;
    if (code === 'E_NOT_EMPTY') {
      logWarn('deleteEmptyFolder: folder is not empty, kept', path);
      return false;
    }
    logFileCallFailure('deleteEmptyFolder: failed', path, errorMessage(e));
    throw e;
  }
}

/**
 * @internal supernote/ only. The native GtdParaFile module and the
 * folder-change notifications, shared by fileSystem.ts and the modules split
 * off it (noteFileApi.ts, diagnosticFiles.ts), so that none of them imports
 * fileSystem.ts back (docs/dev/history/technical-design-filesystem-split.md, As built).
 */
import {NativeModules} from 'react-native';
import {logError} from '../utils/log';
import {errorMessage} from '../utils/errorMessage';
import type {FileStat, FolderEntry} from './fileSystem';

export interface GtdParaFileNativeModule {
  listFolderEntries(folderPath: string): Promise<FolderEntry[]>;
  readTextFile(path: string): Promise<string | null>;
  writeTextFile(path: string, content: string): Promise<'atomic' | 'direct'>;
  ensureFolder(path: string): Promise<boolean>;
  moveFolder(fromPath: string, toPath: string): Promise<boolean>;
  moveFile(fromPath: string, toPath: string): Promise<boolean>;
  moveFolderMerge(fromPath: string, toPath: string): Promise<boolean>;
  deleteTempTree(path: string): Promise<boolean>;
  /** The plugin's private temp folder (technical-design-inkhub-submission.md §3.2). */
  getPrivateTempDir(): Promise<string>;
  /** The plugin's private data folder (technical-design-lasso-0.8.md §3.3). */
  getPrivateDataDir(): Promise<string>;
  /** Recursive delete strictly inside the private data folder. */
  deletePrivateDataTree(path: string): Promise<boolean>;
  /** Deletes an EMPTY folder only. */
  deleteEmptyFolder(path: string): Promise<boolean>;
  /** Recursive delete of Kept's own folders only (technical-design-remove-data.md §4). */
  deleteKeptTree(path: string): Promise<boolean>;
  /** Deletes a file named like Kept's data files only (§4). */
  deleteKeptFile(path: string): Promise<boolean>;
  writeBinaryFile(path: string, base64Content: string): Promise<boolean>;
  /** Debug-log sink. */
  appendTextFile(path: string, content: string, maxBytes: number): Promise<number>;
  /** technical-design-files-0.6.md §3.1. */
  statFiles(paths: string[]): Promise<FileStat[]>;
}

const {GtdParaFile} = NativeModules as {GtdParaFile?: GtdParaFileNativeModule};

/** The native GtdParaFile module, or undefined on a build without it. */
export function nativeFileModule(): GtdParaFileNativeModule | undefined {
  return GtdParaFile;
}

// ---- folder-change notifications ----
// File-creating and moving calls below report the folder(s) they changed, so
// a live folder listing (ui/FileBrowserPane.tsx) can rescan the folder it is
// showing instead of waiting for the user to navigate away and back (e.g. a
// Quick Add note appears in the Files pane right away). Plain
// text writes (project.txt saves) deliberately do NOT notify - they never
// add a file the user browses for, and a rescan per todo edit would flicker.

type FolderChangeListener = (folderPath: string) => void;
const folderChangeListeners = new Set<FolderChangeListener>();

export function parentFolder(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.slice(0, Math.max(0, trimmed.lastIndexOf('/')));
}

/** Subscribe to "a file or folder was created/moved in this folder". Returns the unsubscribe function. */
export function subscribeFolderChanges(listener: FolderChangeListener): () => void {
  folderChangeListeners.add(listener);
  return () => {
    folderChangeListeners.delete(listener);
  };
}

export function notifyFolderChanged(...paths: string[]): void {
  for (const path of paths) {
    const folder = path.replace(/\/+$/, '');
    folderChangeListeners.forEach(listener => {
      try {
        listener(folder);
      } catch (e) {
        logError('notifyFolderChanged: listener threw', errorMessage(e));
      }
    });
  }
}


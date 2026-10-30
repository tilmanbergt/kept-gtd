/**
 * Linking files from anywhere on the device (docs/dev/history/technical-design-easy-start.md §6):
 * which top-level device folders the Files pane's Device tab shows, and the
 * "This file" targets - the note or document Kept was opened from, with or
 * without its current page. Pure.
 */
import {buildPageAnchor} from './sharedNotePages';
import {AREA_FILE_NAME, INBOX_FILE_NAME, PROJECT_FILE_NAME} from './types';

/**
 * The folders of the internal storage the Device tab offers: the Supernote's
 * own, beside `Note` - not the folders of Android and its apps (Alarms, DCIM,
 * Logs …; Tilman's decision on requirement L2, see the design's As built).
 */
export const DEVICE_FOLDERS = ['Document', 'Download', 'EXPORT', 'INBOX', 'MyStyle', 'Note', 'SCREENSHOT'];
const DEVICE_FOLDER_SET = new Set(DEVICE_FOLDERS);
/** Folders of an SD card the Device tab leaves out, besides hidden ones (a leading "."). */
const SD_SYSTEM_FOLDERS = new Set(['Android', 'LOST.DIR']);

/**
 * Whether a top-level entry shows on the Device tab: on the internal storage
 * one of DEVICE_FOLDERS, on an SD card everything but hidden and system folders.
 */
export function deviceEntryVisible(name: string, internal: boolean): boolean {
  if (internal) return DEVICE_FOLDER_SET.has(name);
  return !name.startsWith('.') && !SD_SYSTEM_FOLDERS.has(name);
}

export type ThisFileKind = 'note' | 'document';

export interface ThisFileTargets {
  /** Absolute path of the file Kept was opened from. */
  path: string;
  /** The file name, for the row's label. */
  label: string;
  kind: ThisFileKind;
  /** 0-based page from the host, or null when it couldn't be read. */
  page: number | null;
  /** The link to that page (`<path>#page=<n>`, n 1-based like a lasso link), or null without a page. */
  withPage: string | null;
  /** The link without a page: the host opens it where it was last left. */
  withoutPage: string;
}

const DATA_FILES = new Set([PROJECT_FILE_NAME, AREA_FILE_NAME, INBOX_FILE_NAME]);

/**
 * The This-file targets for `launchPath` (the file Kept was opened from) and
 * the host's current `page`, or null when the launch file is unknown or is
 * one of Kept's own data files. A `.note` is a note, anything else a document.
 */
export function thisFileTargets(launchPath: string | null | undefined, page: number | null): ThisFileTargets | null {
  if (!launchPath || !launchPath.startsWith('/')) return null;
  const label = launchPath.slice(launchPath.lastIndexOf('/') + 1);
  if (!label || DATA_FILES.has(label)) return null;
  const kind: ThisFileKind = label.toLowerCase().endsWith('.note') ? 'note' : 'document';
  const validPage = page !== null && Number.isInteger(page) && page >= 0 ? page : null;
  return {
    path: launchPath,
    label,
    kind,
    page: validPage,
    withPage: validPage === null ? null : buildPageAnchor(launchPath, validPage),
    withoutPage: launchPath,
  };
}

/** Quick Add's This-file line starts on (with the page) for a document, off for a note (requirement L4). */
export function thisFileStartsOn(kind: ThisFileKind): boolean {
  return kind === 'document';
}

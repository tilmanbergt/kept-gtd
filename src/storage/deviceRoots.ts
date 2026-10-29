/**
 * The roots of the Files pane's Device tab (docs/dev/history/technical-design-easy-start.md §6.1):
 * the internal storage always, and every SD card that lists something
 * (`/storage` entries other than the internal storage's own names). Read once
 * per session; a failed read leaves the internal storage alone.
 */
import {listFolderEntries} from '../supernote/fileSystem';
import {errorMessage} from '../utils/errorMessage';
import {log, logWarn} from '../utils/log';
import {INTERNAL_STORAGE} from '../supernote/devicePaths';
import {sdCardCandidates, STORAGE_ROOT} from './deviceCheck';

export interface DeviceRoots {
  internal: string;
  /** Absolute paths of the SD cards in the device; usually none. */
  sdCards: string[];
}

let cached: Promise<DeviceRoots> | null = null;

async function readDeviceRoots(): Promise<DeviceRoots> {
  const sdCards: string[] = [];
  try {
    for (const candidate of sdCardCandidates(await listFolderEntries(STORAGE_ROOT))) {
      if ((await listFolderEntries(candidate.path)).length > 0) sdCards.push(candidate.path);
    }
  } catch (e) {
    logWarn('deviceRoots: reading the SD cards failed', errorMessage(e));
  }
  log('deviceRoots: read', `sd cards ${sdCards.length}`);
  return {internal: INTERNAL_STORAGE, sdCards};
}

export function listDeviceRoots(): Promise<DeviceRoots> {
  cached ??= readDeviceRoots();
  return cached;
}

/** Forgets the roots read, so the next call reads them again (scenario tests put an SD card in). */
export function forgetDeviceRoots(): void {
  cached = null;
}

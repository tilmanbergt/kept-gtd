/**
 * Settings → Advanced → Check device files (docs/dev/history/technical-design-easy-start.md
 * §7, §8 S0): a diagnostic that answers what the Device tab and the This-file
 * rows depend on - which folders outside `Note/` and on an SD card list, which
 * file the plugin was opened from and on which page. It only reads.
 *
 * The result holds top-level folder names for the screen; the log gets counts
 * only.
 */
import {INTERNAL_STORAGE} from '../supernote/devicePaths';
import {FolderEntry, getRememberedLaunchNotePath, listFolderEntries} from '../supernote/fileSystem';
import {getCurrentPageNum} from '../supernote/currentPage';
import {errorMessage} from '../utils/errorMessage';
import {log, logWarn} from '../utils/log';

// The one device root (supernote/devicePaths.ts), also offered here until its importers point there.
export {INTERNAL_STORAGE};
export const STORAGE_ROOT = '/storage';
/** Entries of `/storage` that are the internal storage under other names, not an SD card. */
const NOT_SD = new Set(['emulated', 'self']);

/** The folders of a `/storage` listing that can be an SD card. */
export function sdCardCandidates(entries: FolderEntry[]): FolderEntry[] {
  return entries.filter(e => e.isFolder && !NOT_SD.has(e.name));
}

export interface DeviceCheckListing {
  path: string;
  /** Null when the listing failed; then `error` says why. */
  folders: string[] | null;
  files: number;
  error?: string;
}

export type SampleKind = 'pdf' | 'epub' | 'note';

export interface DeviceCheckSample {
  kind: SampleKind;
  path: string;
}

export interface DeviceCheckResult {
  listings: DeviceCheckListing[];
  /** The file Kept was opened from (the last open), or null when opened from Home. */
  launchPath: string | null;
  /** `getCurrentPageNum` right now (0-based per the SDK), or null when it could not be read. */
  page: number | null;
  /** The first PDF, EPUB and `.note` found outside `Note/`, to open by hand. */
  samples: DeviceCheckSample[];
}

async function list(path: string): Promise<{entries: FolderEntry[] | null; error?: string}> {
  try {
    return {entries: await listFolderEntries(path)};
  } catch (e) {
    const message = errorMessage(e);
    logWarn('deviceCheck: a listing failed', message);
    return {entries: null, error: message};
  }
}

function listingOf(path: string, entries: FolderEntry[] | null, error?: string): DeviceCheckListing {
  if (!entries) return {path, folders: null, files: 0, error};
  return {path, folders: entries.filter(e => e.isFolder).map(e => e.name), files: entries.filter(e => !e.isFolder).length};
}

function sampleKind(name: string): SampleKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.epub')) return 'epub';
  if (lower.endsWith('.note')) return 'note';
  return null;
}

/** Fills `found` with the first file of each kind among `entries`, then one level deeper. */
async function collectSamples(entries: FolderEntry[], found: Map<SampleKind, string>, depth: number): Promise<void> {
  for (const e of entries) {
    const kind = e.isFolder ? null : sampleKind(e.name);
    if (kind && !found.has(kind)) found.set(kind, e.path);
  }
  if (depth <= 0 || found.size === 3) return;
  for (const e of entries.filter(x => x.isFolder && !x.name.startsWith('.') && x.name !== 'Note')) {
    if (found.size === 3) return;
    const {entries: inner} = await list(e.path);
    if (inner) await collectSamples(inner, found, depth - 1);
  }
}

export async function runDeviceCheck(): Promise<DeviceCheckResult> {
  const internal = await list(INTERNAL_STORAGE);
  const document = await list(`${INTERNAL_STORAGE}/Document`);
  const storage = await list(STORAGE_ROOT);
  const listings = [
    listingOf(INTERNAL_STORAGE, internal.entries, internal.error),
    listingOf(`${INTERNAL_STORAGE}/Document`, document.entries, document.error),
    listingOf(STORAGE_ROOT, storage.entries, storage.error),
  ];
  const sdRoots: FolderEntry[] = [];
  for (const e of sdCardCandidates(storage.entries ?? [])) {
    const sd = await list(e.path);
    listings.push(listingOf(e.path, sd.entries, sd.error));
    if (sd.entries && sd.entries.length > 0) sdRoots.push(...sd.entries);
  }

  const found = new Map<SampleKind, string>();
  if (document.entries) await collectSamples(document.entries, found, 1);
  if (internal.entries) await collectSamples(internal.entries.filter(e => !e.isFolder), found, 0);
  if (sdRoots.length > 0) await collectSamples(sdRoots, found, 1);
  const samples = (['pdf', 'epub', 'note'] as SampleKind[]).flatMap(kind => (found.has(kind) ? [{kind, path: found.get(kind)!}] : []));

  const launchPath = getRememberedLaunchNotePath()?.path ?? null;
  const page = await getCurrentPageNum();
  log(
    'deviceCheck: done',
    `listed ${listings.filter(l => l.folders).length}/${listings.length}`,
    `sd candidates ${listings.length - 3}`,
    `samples ${samples.map(s => s.kind).join(',') || 'none'}`,
    `launch ${launchPath ? (launchPath.toLowerCase().endsWith('.note') ? 'note' : 'document') : 'none'}`,
    `page ${page ?? 'none'}`,
  );
  return {listings, launchPath, page, samples};
}

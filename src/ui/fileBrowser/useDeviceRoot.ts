/**
 * The Files pane's Device tab (docs/dev/history/technical-design-easy-start.md §6.1-6.2):
 * the Supernote's own folders beside `Note` (Document, EXPORT …), to link any
 * file in them. With an SD card in, the tab's top level chooses Internal or SD
 * card (FileBrowserPane's composite `sources` root).
 */
import {useEffect, useState} from 'react';
import {deviceEntryVisible} from '../../domain/linkTargets';
import {DeviceRoots, listDeviceRoots} from '../../storage/deviceRoots';
import {INTERNAL_STORAGE} from '../../supernote/devicePaths';
import {FolderEntry} from '../../supernote/fileSystem';
import type {FileBrowserRoot} from '../FileBrowserPane';

export const DEVICE_ROOT_KEY = 'device';

const visible = (entry: FolderEntry) => deviceEntryVisible(entry.name, entry.path.startsWith(`${INTERNAL_STORAGE}/`));

/** The Device root for a Files pane; `disabled` greys it while an arm can't use it (refile, assign Area). */
export function useDeviceRoot(disabled = false): FileBrowserRoot {
  const [roots, setRoots] = useState<DeviceRoots | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Without an SD card (the usual case) nothing changes, so the page doesn't render again for it.
    listDeviceRoots().then(r => {
      if (!cancelled && r.sdCards.length > 0) setRoots(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const sdCards = roots?.sdCards ?? [];
  return {
    key: DEVICE_ROOT_KEY,
    label: 'Device',
    rootPath: INTERNAL_STORAGE,
    entryFilter: visible,
    disabled,
    ...(sdCards.length > 0
      ? {
          sources: [
            {kind: 'device' as const, path: INTERNAL_STORAGE, label: 'Internal'},
            ...sdCards.map((path, i) => ({kind: 'device' as const, path, label: sdCards.length > 1 ? `SD card ${i + 1}` : 'SD card'})),
          ],
        }
      : {}),
  };
}

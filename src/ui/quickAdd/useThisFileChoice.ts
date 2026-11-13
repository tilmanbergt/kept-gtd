/**
 * Quick Add's This-file choice: the targets of the file Kept was opened from,
 * the chosen mode (reset whenever the file or its page changes) and the linked
 * file a new entry gets - stored like every linked file, relative inside the
 * base folder, absolute outside it (storage/linkedFiles.ts's toLinkedFile).
 *
 * It starts off: the text strip offers `📎 This file`
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.7), and a tap links
 * the file - with its page for a document, without for a note.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {thisFileStartsOn, ThisFileTargets} from '../../domain/linkTargets';
import {resolvePaths} from '../../domain/settings';
import {toLinkedFile} from '../../storage/linkedFiles';
import {peekSettings} from '../../storage/settingsSnapshot';
import {useThisFile} from '../useThisFile';

/** Off, the file with the page Kept was opened on, or the file without a page. */
export type ThisFileMode = 'off' | 'page' | 'file';

/** The mode a new target starts in. */
export function startMode(targets: ThisFileTargets, startsOn: boolean): ThisFileMode {
  if (!startsOn) return 'off';
  return targets.withPage ? 'page' : 'file';
}

/** The file a new entry links in `mode`, absolute, or null when off. */
export function linkedPathFor(targets: ThisFileTargets | null, mode: ThisFileMode): string | null {
  if (!targets || mode === 'off') return null;
  return mode === 'page' ? targets.withPage ?? targets.withoutPage : targets.withoutPage;
}

export interface ThisFileChoice {
  targets: ThisFileTargets | null;
  mode: ThisFileMode;
  setMode: (mode: ThisFileMode) => void;
  /** Stable: the linked file for the entry being added now, or undefined. */
  linkedFile: () => string | undefined;
  /** `📎 This file` tapped: links it. */
  offer: () => void;
  /** The linked file's name while one is chosen, else null. */
  label: string | null;
}

export function useThisFileChoice(active: boolean): ThisFileChoice {
  const targets = useThisFile(active);
  const [mode, setMode] = useState<ThisFileMode>('off');
  useEffect(() => {
    setMode('off');
  }, [targets]);
  // Read at + Add: the settings snapshot gives the base folder without following settings changes,
  // which would render Quick Add again for every saved setting.
  const latest = useRef<string | null>(null);
  latest.current = linkedPathFor(targets, mode);
  const linkedFile = useCallback(() => {
    const path = latest.current;
    if (!path) return undefined;
    const settings = peekSettings();
    return settings ? toLinkedFile(resolvePaths(settings), path) : path;
  }, []);
  const offer = useCallback(() => {
    if (targets) setMode(startMode(targets, true) === 'page' && thisFileStartsOn(targets.kind) ? 'page' : 'file');
  }, [targets]);
  return {targets, mode, setMode, linkedFile, offer, label: targets && mode !== 'off' ? targets.label : null};
}

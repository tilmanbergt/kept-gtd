/**
 * The state of Quick Add's This-file line (ui/quickAdd/ThisFileLine.tsx): the
 * targets of the file Kept was opened from, the chosen mode (reset whenever the
 * file or its page changes) and the linked file a new entry gets - stored like
 * every linked file, relative inside the base folder, absolute outside it
 * (storage/linkedFiles.ts's toLinkedFile).
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {thisFileStartsOn, ThisFileTargets} from '../../domain/linkTargets';
import {resolvePaths} from '../../domain/settings';
import {toLinkedFile} from '../../storage/linkedFiles';
import {peekSettings} from '../../storage/settingsSnapshot';
import {useThisFile} from '../useThisFile';
import {linkedPathFor, startMode, ThisFileMode} from './ThisFileLine';

export interface ThisFileChoice {
  targets: ThisFileTargets | null;
  mode: ThisFileMode;
  setMode: (mode: ThisFileMode) => void;
  /** Stable: the linked file for the entry being added now, or undefined. */
  linkedFile: () => string | undefined;
}

export function useThisFileChoice(active: boolean): ThisFileChoice {
  const targets = useThisFile(active);
  const [mode, setMode] = useState<ThisFileMode>('off');
  useEffect(() => {
    setMode(targets ? startMode(targets, thisFileStartsOn(targets.kind)) : 'off');
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
  return {targets, mode, setMode, linkedFile};
}

/**
 * The "For" chips of the capture panel's Agreement kind
 * (docs/dev/history/technical-design-meetings-0.21.md §7): who the agreement
 * is with - the page meeting's thread or loop first, then the note's Project
 * or Area - and More…, every active Project and Area alphabetically,
 * `pageSize` per page, behind ‹ Short list. Never the Inbox (R18).
 */
import {fileToEligible, fileToLabel} from '../../domain/captureFileTo';
import {CachedItem} from '../../storage/dataCache';
import {GridChip} from '../TagChipGrid';

/** One owner an agreement can be for: where it is written and the tag it gets. */
export interface AgreementForChoice {
  key: string;
  label: string;
  /** The file it is written to (domain/agreementOwner.ts's `agreementTargetPath`). */
  targetPath: string;
  /** The thread's or loop's tag the words get; null for a Project or Area. */
  tag: string | null;
}

interface Input {
  choices: readonly AgreementForChoice[];
  items: CachedItem[];
  current: AgreementForChoice | null;
  showAll: boolean;
  page: number;
  pageSize: number;
  onPick: (choice: AgreementForChoice) => void;
  setShowAll: (showAll: boolean) => void;
  setPage: (page: number) => void;
}

/** A Project or Area as a choice. */
export function itemForChoice(item: {kind: 'project' | 'area'; name: string; path: string; abbrev: string | null}): AgreementForChoice {
  return {key: item.path, label: fileToLabel(item), targetPath: item.path, tag: null};
}

export function buildAgreementForChips({choices, items, current, showAll, page, pageSize, onPick, setShowAll, setPage}: Input): GridChip[] {
  const chipOf = (choice: AgreementForChoice): GridChip => ({
    key: choice.key,
    label: choice.label,
    on: current?.key === choice.key,
    onPress: () => onPick(choice),
  });
  if (!showAll) {
    const short = [...choices];
    if (current && !short.some(c => c.key === current.key)) short.push(current);
    return [...short.map(chipOf), {key: 'more', label: 'More…', on: false, onPress: () => setShowAll(true)}];
  }
  const all = fileToEligible(items).map(itemForChoice);
  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const shown = Math.min(page, pages - 1);
  const chips: GridChip[] = [
    {key: 'less', label: '‹ Short list', on: false, onPress: () => setShowAll(false)},
    ...all.slice(shown * pageSize, (shown + 1) * pageSize).map(choice => ({
      ...chipOf(choice),
      onPress: () => {
        onPick(choice);
        setShowAll(false);
      },
    })),
  ];
  if (pages > 1) chips.push({key: 'page', label: `${shown + 1}/${pages} ›`, on: false, onPress: () => setPage((shown + 1) % pages)});
  return chips;
}

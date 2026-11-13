/**
 * Week's and Month's owner card (docs/dev/history/technical-design-calmer-screens.md
 * §3.9, O4): a tap on a Given time line shows its card in Quick Add's box
 * (ui/itemCard/OwnerTimeCard.tsx) - the first tap never opens the owner. A
 * selected meeting ends it; ✕ and Open › close it.
 */
import React, {useEffect, useState} from 'react';
import {GivenTimeRow} from '../../domain/givenTime';
import OwnerTimeCard from '../itemCard/OwnerTimeCard';
import {useStableCallback} from '../useStableCallback';
import {perfBegin} from '../../utils/perf';
import {givenTimeRowKey, openGivenTimeOwner} from './GivenTimePanel';

interface Input {
  /** Week or Month, for the perf trace. */
  screen: string;
  onOpenItem: (path: string) => void;
  /** Ends a meeting's card or edit (the box shows one thing). */
  cancelEdit: () => void;
  /** A meeting is selected: no owner card then. */
  editing: boolean;
  textColor: string;
  borderColor: string;
}

export function useOwnerCard({screen, onOpenItem, cancelEdit, editing, textColor, borderColor}: Input) {
  const [row, setRow] = useState<GivenTimeRow | null>(null);
  useEffect(() => {
    if (editing) setRow(null);
  }, [editing]);
  const select = useStableCallback((next: GivenTimeRow) => {
    perfBegin('tap', 'card', {screen});
    cancelEdit();
    setRow(next);
  });
  const close = useStableCallback(() => setRow(null));
  const open = useStableCallback(() => {
    if (!row) return;
    setRow(null);
    openGivenTimeOwner(row.owner, onOpenItem);
  });
  const card = row && !editing ? <OwnerTimeCard row={row} onOpen={open} onClose={close} textColor={textColor} borderColor={borderColor} /> : null;
  return {card, select, selectedKey: row && !editing ? givenTimeRowKey(row) : null};
}

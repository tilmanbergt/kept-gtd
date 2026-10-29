/**
 * The active context on a filtered tab (docs/dev/history/technical-design-time-and-place.md
 * §3.3, D22-D24): the matcher from the settings snapshot, the loop kinds and
 * thread types the hidden line counts by, and the tab's own "Show": a
 * temporary Everything that ends when the tab is left (screen state only,
 * never written to the settings).
 */
import {useMemo, useState} from 'react';
import {activeContext, ContextDef, contextMatcher, ContextMatcher, HiddenTally, hiddenLineText} from '../../domain/contexts';
import {threadTypesOf} from '../../domain/counterparts';
import {loopKindsOf} from '../../domain/loops';
import {useOnScreenHide} from '../screenActivity';
import {useSettings} from '../useSettings';

export interface ContextFilter {
  /** The active context (null = Everything), also while Show is on. */
  context: ContextDef | null;
  /** What the tab filters with: Everything while Show is on. */
  matcher: ContextMatcher;
  kinds: {loopKinds: string[]; threadTypes: string[]};
  showAll: boolean;
  show: () => void;
  /** The hidden line's text for `tally`, or null (nothing hidden, Everything, or Show on). */
  lineText: (tally: HiddenTally, itemNoun?: {one: string; many: string}) => string | null;
}

export function useContextMatcher(): ContextFilter {
  const settings = useSettings();
  const [showAll, setShowAll] = useState(false);
  useOnScreenHide(() => setShowAll(false));
  const context = settings ? activeContext(settings) : null;
  const noteSetups = settings?.noteSetups;
  const kinds = useMemo(() => ({loopKinds: loopKindsOf(noteSetups ?? []), threadTypes: threadTypesOf(noteSetups ?? [])}), [noteSetups]);
  const matcher = useMemo(() => contextMatcher(showAll ? null : context), [showAll, context]);
  return {
    context,
    matcher,
    kinds,
    showAll,
    show: () => setShowAll(true),
    lineText: (tally, itemNoun) => (context && !showAll ? hiddenLineText(context.name, tally, itemNoun) : null),
  };
}

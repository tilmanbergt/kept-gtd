/**
 * The active context on a filtered tab: the matcher over the cached items, the
 * loop kinds and thread types the hidden line counts by, and the tab's own
 * Everything/context choice. `show()` and `narrow()` change it until the tab
 * is left (screen state only, never written to the settings); then it goes
 * back to `startAll` (Review starts in Everything,
 * docs/dev/history/technical-design-contexts-tags.md §2.2-§2.3).
 */
import {useMemo, useState} from 'react';
import {activeContext, ContextDef, contextMatcher, ContextMatcher, HiddenTally, hiddenLineText} from '../../domain/contexts';
import {threadTypesOf} from '../../domain/counterparts';
import {loopKindsOf} from '../../domain/loops';
import {todayIso} from '../../domain/meetingTime';
import {useOnScreenHide} from '../screenActivity';
import {useCachedItems} from '../useCachedItems';
import {useSettings} from '../useSettings';

export interface ContextFilter {
  /** The active context (null = Everything), also while Show is on. */
  context: ContextDef | null;
  /** What the tab filters with: Everything while Show is on. */
  matcher: ContextMatcher;
  kinds: {loopKinds: string[]; threadTypes: string[]};
  showAll: boolean;
  show: () => void;
  narrow: () => void;
  /** The hidden line's text for `tally`, or null (nothing hidden, Everything, or Show on). */
  lineText: (tally: HiddenTally, itemNoun?: {one: string; many: string}) => string | null;
}

export function useContextMatcher(opts: {startAll?: boolean} = {}): ContextFilter {
  const startAll = opts.startAll ?? false;
  const settings = useSettings();
  const items = useCachedItems();
  const [showAll, setShowAll] = useState(startAll);
  useOnScreenHide(() => setShowAll(startAll));
  const context = settings ? activeContext(settings) : null;
  const noteSetups = settings?.noteSetups;
  const kinds = useMemo(() => ({loopKinds: loopKindsOf(noteSetups ?? []), threadTypes: threadTypesOf(noteSetups ?? [])}), [noteSetups]);
  const filtering = showAll ? null : context;
  const matcher = useMemo(() => contextMatcher(filtering, items, todayIso()), [filtering, items]);
  return {
    context,
    matcher,
    kinds,
    showAll,
    show: () => setShowAll(true),
    narrow: () => setShowAll(false),
    lineText: (tally, itemNoun) => (context && !showAll ? hiddenLineText(context.name, tally, itemNoun) : null),
  };
}

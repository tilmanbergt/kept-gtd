/**
 * What a Project's or Area's page shows from the cache besides its lists
 * (docs/dev/history/technical-design-calmer-screens.md §3.8): the counts
 * behind "Show on this page" (storage/pageShowCounts.ts), the `show:` value,
 * the scope and the Area. The page re-renders only
 * when one of these changes (ui/useCacheSignature.ts), not for every todo
 * edit. Null until the item is cached.
 */
import {useMemo} from 'react';
import {PageShow, parsePageShow, serializePageShow, ShowCounts} from '../../domain/pageShow';
import {findCachedItem, getCachedData} from '../../storage/dataCache';
import {pageShowCounts} from '../../storage/pageShowCounts';
import {useCacheSignature} from '../../ui/useCacheSignature';
import {useThreadRuleTypes} from '../thread/useTending';
import {useLoopKinds} from '../../ui/useLoopKinds';

export interface PageFacts {
  counts: ShowCounts;
  show: PageShow;
  scope: string;
  area: string | null;
}

interface Signed {
  counts: ShowCounts;
  show: string;
  scope: string;
  area: string | null;
}

export function usePageFacts(path: string, hasHomeNotebook: boolean): PageFacts | null {
  const ruleTypes = useThreadRuleTypes();
  const {kinds} = useLoopKinds();
  const signature = useCacheSignature(() => {
    const item = findCachedItem(path);
    if (!item) return '';
    const signed: Signed = {
      counts: pageShowCounts(item, getCachedData()?.items ?? [], ruleTypes, kinds, hasHomeNotebook),
      show: serializePageShow(item.show) ?? '',
      scope: item.scope,
      area: item.area,
    };
    return JSON.stringify(signed);
  });
  return useMemo(() => {
    if (!signature) return null;
    const signed = JSON.parse(signature) as Signed;
    return {...signed, show: parsePageShow(signed.show)};
  }, [signature]);
}

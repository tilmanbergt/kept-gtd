/**
 * What each "Show on this page" part of a project or area has
 * (domain/pageShow.ts ShowCounts), from the cache only: its threads, its
 * active loops, its active agreements, its meetings (F blocks included), its
 * home notebook, and - for an area - the projects assigned to it.
 */
import {isActiveAgreement} from '../domain/agreements';
import {ShowCounts} from '../domain/pageShow';
import {assignedProjects} from './areaAssignment';
import {CachedItem} from './dataCache';

export function pageShowCounts(
  item: Pick<
    CachedItem,
    'kind' | 'name' | 'threads' | 'loops' | 'agreements' | 'meetings'
  >,
  hasHomeNotebook: boolean,
): ShowCounts {
  return {
    threads: item.threads.length,
    loops: item.loops.filter(l => l.status === 'active').length,
    agreements: item.agreements.filter(isActiveAgreement).length,
    schedule: item.meetings.length,
    notebook: hasHomeNotebook ? 1 : 0,
    projects: item.kind === 'area' ? assignedProjects(item.name).length : 0,
  };
}

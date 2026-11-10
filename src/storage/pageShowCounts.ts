/**
 * What each "Show on this page" part of a project or area has
 * (domain/pageShow.ts ShowCounts), from the cache only: the counterparts its
 * Threads tab lists (tracked, new and inactive - the same scope as
 * screens/thread/ThreadsTab.tsx), its active loops, its active agreements,
 * its meetings (F blocks included), its home notebook, and - for an area -
 * the projects assigned to it.
 */
import {counterpartsOf, CounterpartScope, scopeMembers, scopeOwnerOf} from '../domain/counterparts';
import {isActiveAgreement} from '../domain/agreements';
import {ShowCounts} from '../domain/pageShow';
import {assignedProjects} from './areaAssignment';
import {CachedItem} from './dataCache';

/** The scope of the page `path` and, on a Project with an Area, the counterparts its own entries use. */
export function pageScope(path: string, items: CachedItem[], ruleTypes: readonly string[]): {scope: CounterpartScope<CachedItem>; only: Set<string> | null} | null {
  const owner = scopeOwnerOf(path, items);
  if (!owner) return null;
  const scope = {owner, members: scopeMembers(owner, items)};
  if (owner.path === path) return {scope, only: null};
  const page = items.find(i => i.path === path);
  if (!page) return {scope, only: new Set()};
  const used = counterpartsOf({owner: page, members: [page]}, ruleTypes).filter(c => c.inUse);
  return {scope, only: new Set(used.map(c => c.leaf))};
}

/** How many counterparts the page's Threads tab lists. */
function threadCount(path: string, items: CachedItem[], ruleTypes: readonly string[]): number {
  const page = pageScope(path, items, ruleTypes);
  if (!page) return 0;
  const all = counterpartsOf(page.scope, ruleTypes);
  return page.only === null ? all.length : all.filter(c => page.only?.has(c.leaf)).length;
}

export function pageShowCounts(item: CachedItem, items: CachedItem[], ruleTypes: readonly string[], hasHomeNotebook: boolean): ShowCounts {
  return {
    threads: threadCount(item.path, items, ruleTypes),
    loops: item.loops.filter(l => l.status === 'active').length,
    agreements: item.agreements.filter(isActiveAgreement).length,
    schedule: item.meetings.length,
    notebook: hasHomeNotebook ? 1 : 0,
    projects: item.kind === 'area' ? assignedProjects(item.name).length : 0,
  };
}

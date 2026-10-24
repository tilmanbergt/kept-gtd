/**
 * Which agreements the Weekly Review asks about
 * (docs/dev/history/technical-design-meetings-0.21.md R25, §9): active
 * agreements past their valid-till, of an inactive counterpart, of a loop
 * that is not active, or in a Project/Area that is done or on hold - each
 * with every reason that applies, grouped by the file they live in. Pure.
 */
import {AgreementRef} from './agreementOwner';
import {Agreement, isActiveAgreement, isOverAgreement} from './agreements';
import {scopeOwnerOf} from './counterparts';
import {EngageItem, EngageItemRef, EngageSource, itemRefOf} from './engageOwner';
import {belongsToLoop} from './loops';
import {threadOf} from './threads';
import {statusIn} from './threadsSection';

export type AgreementReviewReason = 'over' | 'counterpartInactive' | 'loopClosed' | 'itemDone' | 'itemOnHold';

export interface AgreementReviewRow {
  ref: AgreementRef;
  reasons: AgreementReviewReason[];
}

export interface AgreementReviewGroup {
  item: EngageItemRef;
  rows: AgreementReviewRow[];
}

/** The counterparts an agreement names: of its thread tags (a Thread setup's type), and plain leaves the scope tends. */
function counterpartsOf(a: Agreement, source: EngageSource, tended: readonly string[]): string[] {
  const out: string[] = [];
  for (const tag of a.tags) {
    const thread = threadOf(tag);
    const cp = thread && source.threadTypes.includes(thread.type) ? thread.counterpart : tended.includes(tag) ? tag : null;
    if (cp && !out.includes(cp)) out.push(cp);
  }
  return out;
}

function reasonsOf(a: Agreement, item: EngageItem, source: EngageSource, today: string): AgreementReviewReason[] {
  const reasons: AgreementReviewReason[] = [];
  if (isOverAgreement(a, today)) reasons.push('over');
  const scopeOwner = scopeOwnerOf(item.path, source.items) ?? item;
  const tended = scopeOwner.threads.map(t => t.leaf);
  if (counterpartsOf(a, source, tended).some(cp => statusIn(scopeOwner.threads, cp) === 'inactive')) reasons.push('counterpartInactive');
  if (item.loops.some(l => l.status !== 'active' && belongsToLoop(a.tags, l.tag))) reasons.push('loopClosed');
  if (item.status === 'done') reasons.push('itemDone');
  if (item.status === 'on-hold') reasons.push('itemOnHold');
  return reasons;
}

/** The agreements to review, by file in the items' order, file order inside (R25). */
export function agreementsToReview(source: EngageSource, today: string): AgreementReviewGroup[] {
  const groups: AgreementReviewGroup[] = [];
  for (const item of source.items) {
    if (item.status === 'archived') continue;
    const rows: AgreementReviewRow[] = [];
    item.agreements.forEach((agreement, index) => {
      if (!isActiveAgreement(agreement)) return;
      const reasons = reasonsOf(agreement, item, source, today);
      if (reasons.length > 0) rows.push({ref: {itemPath: item.path, index, agreement}, reasons});
    });
    if (rows.length > 0) groups.push({item: itemRefOf(item), rows});
  }
  return groups;
}

/** How many agreements the step lists. */
export function agreementReviewCount(groups: readonly AgreementReviewGroup[]): number {
  return groups.reduce((n, g) => n + g.rows.length, 0);
}

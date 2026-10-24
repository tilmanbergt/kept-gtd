/**
 * Who an agreement captured from a page can be for
 * (docs/dev/history/technical-design-meetings-0.21.md §7, R18): the owner of
 * the page's meeting when that is a thread or a loop, then the Project or
 * Area the note (or the mark) belongs to. Empty for a page of the Inbox or
 * of no item: the panel then offers no Agreement kind.
 */
import {agreementTargetPath} from '../../domain/agreementOwner';
import {Destination} from '../../domain/destination';
import {EngageSource, ownerOfMeeting} from '../../domain/engageOwner';
import {Meeting} from '../../domain/types';
import {AgreementForChoice, itemForChoice} from '../quickAdd/agreementForChips';

export function agreementForChoices(
  source: EngageSource,
  pageMeeting: {itemPath: string; meeting: Meeting} | null,
  noteOwner: Destination | null,
): AgreementForChoice[] {
  const out: AgreementForChoice[] = [];
  const owner = pageMeeting ? ownerOfMeeting(pageMeeting, source) : null;
  if (owner && owner.kind !== 'item') {
    const targetPath = agreementTargetPath(owner, source);
    if (targetPath) out.push({key: `${owner.kind}:${owner.tag}`, label: `#${owner.tag}`, targetPath, tag: owner.tag});
  }
  const itemPaths = [owner?.kind === 'item' ? owner.itemPath : null, noteOwner?.type === 'item' ? noteOwner.path : null];
  for (const path of itemPaths) {
    const item = path ? source.items.find(i => i.path === path) : undefined;
    if (item && !out.some(c => c.key === item.path)) out.push(itemForChoice(item));
  }
  return out;
}

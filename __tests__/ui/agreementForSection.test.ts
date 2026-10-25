// docs/dev/history/technical-design-engage-page-owner.md §3.6, P10: without a page meeting, the section's thread or
// loop comes first in an agreement's For chips; an item section adds nothing.
import {EngageSource} from '../../src/domain/engageOwner';
import {agreementForChoices} from '../../src/ui/capture/agreementFor';
import {item} from '../../test-helpers/fixtures';

const sport = item('area', 'Sport', {loops: [{tag: 'loop/marathon', status: 'active', mainDate: null, linkedFile: null, extraColumns: [], raw: null}]});
const source: EngageSource = {items: [sport], inbox: null, loopKinds: ['loop'], threadTypes: []};
const noteOwner = {type: 'item' as const, kind: 'area' as const, name: 'Sport', path: sport.path};

describe('agreementForChoices with the section\'s owner', () => {
  it('a loop section: the loop first, then the note\'s area', () => {
    const chips = agreementForChoices(source, null, noteOwner, {kind: 'loop', itemPath: sport.path, tag: 'loop/marathon'});
    expect(chips.map(c => c.label)).toEqual(['#loop/marathon', expect.stringContaining('Sport')]);
  });
  it('an item section or none: the note\'s area only', () => {
    expect(agreementForChoices(source, null, noteOwner, {kind: 'item', itemPath: sport.path}).map(c => c.key)).toEqual([sport.path]);
    expect(agreementForChoices(source, null, noteOwner).map(c => c.key)).toEqual([sport.path]);
  });
});

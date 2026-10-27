import {destinationCandidates} from '../../src/domain/destination';
import {ItemStatus} from '../../src/domain/types';

const c = (name: string, status: ItemStatus) => ({name, status});

describe('destinationCandidates', () => {
  it('offers only active items', () => {
    const out = destinationCandidates([c('A', 'active'), c('B', 'on-hold'), c('C', 'done'), c('D', 'archived')]);
    expect(out.map(x => x.name)).toEqual(['A']);
  });
  it('keeps the order it was given', () => {
    const out = destinationCandidates([c('A', 'active'), c('B', 'active'), c('C', 'active'), c('D', 'active')]);
    expect(out.map(x => x.name)).toEqual(['A', 'B', 'C', 'D']);
  });
  it('does not change the input array', () => {
    const input = [c('A', 'active'), c('B', 'on-hold')];
    destinationCandidates(input);
    expect(input.map(x => x.name)).toEqual(['A', 'B']);
  });
});

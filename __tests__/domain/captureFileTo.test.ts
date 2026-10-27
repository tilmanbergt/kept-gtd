import {fileToEligible, fileToLabel, fileToShortList, FileToItem} from '../../src/domain/captureFileTo';

const item = (name: string, extra: Partial<FileToItem> = {}): FileToItem => ({
  kind: 'project',
  name,
  path: `/P/${name}`,
  abbrev: name.slice(0, 2).toLowerCase(),
  status: 'active',
  ...extra,
});
const dest = (i: FileToItem) => ({type: 'item' as const, kind: i.kind, name: i.name, path: i.path});

describe('File to', () => {
  const items = [
    item('Zeta'),
    item('Alpha'),
    item('Beta'),
    item('Gamma', {status: 'on-hold'}),
    item('Delta'),
    item('Eps'),
  ];
  it('offers only Active items, alphabetically', () => {
    expect(fileToEligible(items).map(i => i.name)).toEqual(['Alpha', 'Beta', 'Delta', 'Eps', 'Zeta']);
  });
  it('short list: own place, current choice, recent', () => {
    const own = dest(items[0]);
    const current = dest(items[4]);
    expect(fileToShortList(items, own, current, ['/P/Zeta', '/P/Gone', '/P/Beta']).map(i => i.name)).toEqual(['Zeta', 'Delta', 'Beta']);
  });
  it('keeps the own place and the current choice past the limit', () => {
    const own = dest(items[0]);
    const current = dest(items[4]);
    expect(fileToShortList(items, own, current, [], 2).map(i => i.name)).toEqual(['Zeta', 'Delta']);
    expect(fileToShortList(items, null, {type: 'inbox'}, ['/P/Beta', '/P/Eps'], 1).map(i => i.name)).toEqual(['Beta']);
  });
  it('labels with the abbreviation when there is one', () => {
    expect(fileToLabel({abbrev: 'ab', name: 'Alpha'})).toBe('#AB Alpha');
    expect(fileToLabel({abbrev: null, name: 'Alpha'})).toBe('Alpha');
  });
});

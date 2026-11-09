// docs/dev/history/technical-design-writing-help.md §1.8, §3.9: tags that look like a typo.
import {runWholeRunChecks, ScannedItemSummary} from '../../../src/domain/integrityCheck';
import {countTags, tagTypos, typoIndex} from '../../../src/domain/writing/tagTypos';

const base = {setupTags: [], abbrevs: [], counterparts: [], contextTags: [], reservedTags: ['next']};

describe('tagTypos', () => {
  const usage = countTags([['daily'], ['daily'], ['daiiy'], ['retro', 'retro'], ['retros'], ['offsite27'], ['nexl'], ['lena'], ['lina'], ['due:2026-11-10']]);

  it('lists tags used once that are one step from a known tag, with the suggestion (scenario 19)', () => {
    expect(tagTypos(usage, typoIndex(usage, base))).toEqual([
      {tag: 'daiiy', suggestion: 'daily'},
      {tag: 'nexl', suggestion: 'next'},
      {tag: 'retros', suggestion: 'retro'},
    ]);
  });

  it('never pairs two tags used once with each other, and leaves new tags alone', () => {
    const typos = tagTypos(usage, typoIndex(usage, base)).map(t => t.tag);
    expect(typos).not.toContain('lena');
    expect(typos).not.toContain('lina');
    expect(typos).not.toContain('offsite27');
  });

  it('compares with setup tags and abbreviations too, and leaves kept tags out', () => {
    const index = typoIndex(usage, {...base, setupTags: ['lena']});
    expect(tagTypos(usage, index).map(t => t.tag)).toContain('lina');
    expect(tagTypos(usage, index, new Set(['lina', 'daiiy'])).map(t => t.tag)).toEqual(['nexl', 'retros']);
  });
});

describe('the Integrity Check tagTypo', () => {
  const item = (name: string, tagCounts: Record<string, number>, inArchive = false): ScannedItemSummary => ({
    itemKind: 'project',
    itemPath: `/P/${name}`,
    itemName: name,
    inArchive,
    area: null,
    abbrev: null,
    tagCounts,
  });

  it('reports a tag used once next to a known one, at the item that uses it', () => {
    const findings = runWholeRunChecks([item('Website', {daily: 2}), item('Garden renovation', {daiiy: 1}), item('Old', {retros: 1, retro: 5}, true)]).filter(
      f => f.checkId === 'tagTypo',
    );
    expect(findings).toEqual([
      {
        checkId: 'tagTypo',
        itemKind: 'project',
        itemPath: '/P/Garden renovation',
        entityKind: 'item',
        entityLabel: '#daiiy',
        notePath: '',
        message: '#daiiy is used once and looks like a typo: → #daily. Settings → Input lists it with the fix.',
      },
    ]);
  });
});

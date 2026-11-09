// docs/dev/history/technical-design-writing-help.md §1.1, §1.2, §1.4, §1.5, §4.
import {buildKnownTagIndex, KnownTagSources} from '../../../src/domain/writing/knownTags';
import {checkTags, normalizeTagSpacing, replaceTag, suggestionFor} from '../../../src/domain/writing/tagCheck';

function index(over: Partial<KnownTagSources> = {}) {
  return buildKnownTagIndex({
    setupTags: ['daily', '101'],
    abbrevs: [{tag: 'gr', name: 'Garden renovation'}],
    counterparts: ['101/mieke'],
    contextTags: [],
    reservedTags: ['next', 'someday', 'monthly'],
    recentTags: [],
    usedTags: [{tag: 'retro', date: ''}, {tag: 'lena', date: ''}],
    ...over,
  });
}

const none = new Set<string>();
const noLearned = new Map<string, string>();

describe('normalizeTagSpacing', () => {
  it('removes a space right after #', () => {
    expect(normalizeTagSpacing('call # lena')).toBe('call #lena');
  });

  it('removes a space right after a / inside a tag', () => {
    expect(normalizeTagSpacing('#1o1/ Mieke today')).toBe('#1o1/Mieke today');
    expect(normalizeTagSpacing('#101/mieke/ 2026')).toBe('#101/mieke/2026');
  });

  it('reads a full-width ＃ as #', () => {
    expect(normalizeTagSpacing('call ＃lena')).toBe('call #lena');
    expect(normalizeTagSpacing('call ＃ lena')).toBe('call #lena');
  });

  it('leaves a slash outside a tag and a trailing slash alone', () => {
    expect(normalizeTagSpacing('a / b and 1/ 2')).toBe('a / b and 1/ 2');
    expect(normalizeTagSpacing('#101/ ')).toBe('#101/ ');
  });
});

describe('checkTags', () => {
  it('suggests the known tag for a handwriting look-alike (scenario 1)', () => {
    expect(checkTags('stand-up #DaiIy', null, index(), none, noLearned)).toEqual([
      {start: 9, end: 15, written: 'DaiIy', suggestion: 'Daily', kind: 'fix'},
    ]);
  });

  it('never questions a known tag in another case (scenario 4)', () => {
    expect(checkTags('stand-up #Daily #DAILY', null, index(), none, noLearned)).toEqual([]);
  });

  it('fixes a nested tag per part, keeping the written spelling of a known part (scenario 5)', () => {
    expect(checkTags('#1o1/Mieke', null, index(), none, noLearned)).toEqual([
      {start: 0, end: 10, written: '1o1/Mieke', suggestion: '101/Mieke', kind: 'fix'},
    ]);
    expect(suggestionFor('101/rnieke', index())).toBe('101/mieke');
    expect(suggestionFor('1o1/sam', index())).toBe('101/sam');
  });

  it('reports several tags in text order (scenario 6)', () => {
    const found = checkTags('for #retros #Iena', null, index(), none, noLearned);
    expect(found.map(f => [f.written, f.suggestion, f.kind])).toEqual([
      ['retros', 'retro', 'fix'],
      ['Iena', 'Lena', 'fix'],
    ]);
  });

  it('applies a learned correction before anything else (scenario 3)', () => {
    expect(checkTags('#DaiIy', null, index(), none, new Map([['daiiy', 'daily']]))).toEqual([
      {start: 0, end: 6, written: 'DaiIy', suggestion: 'Daily', kind: 'learned'},
    ]);
  });

  it('reports a new tag with nothing close (scenario 8)', () => {
    expect(checkTags('#offsite27', null, index(), none, noLearned)).toEqual([
      {start: 0, end: 10, written: 'offsite27', suggestion: null, kind: 'new'},
    ]);
  });

  it('never flags flow-state, reserved, Waiting For or : tags', () => {
    expect(checkTags('#next #wf/lena #wf/Iena #due:2026-11-10 #waiting-for:sam #rnonthly', null, index(), none, noLearned)).toEqual([
      {start: 57, end: 66, written: 'rnonthly', suggestion: 'monthly', kind: 'fix'},
    ]);
  });

  it('leaves a tag the user kept in this draft alone', () => {
    expect(checkTags('#DaiIy', null, index(), new Set(['daiiy']), noLearned)).toEqual([]);
  });

  it('checks only the tags inside the span', () => {
    const text = '#DaiIy and #Iena';
    expect(checkTags(text, {start: 7, end: text.length}, index(), none, noLearned).map(f => f.written)).toEqual(['Iena']);
    expect(checkTags(text, {start: 3, end: 4}, index(), none, noLearned).map(f => f.written)).toEqual(['DaiIy']);
  });

  it('only checks what TAG_RE reads as a tag (§4)', () => {
    expect(checkTags('C# and # and #-x', null, index(), none, noLearned)).toEqual([]);
  });
});

describe('replaceTag', () => {
  it('replaces the tag and puts the cursor after it', () => {
    expect(replaceTag('stand-up #DaiIy now', {start: 9, end: 15}, 'daily')).toEqual({text: 'stand-up #daily now', cursor: 15});
  });
});

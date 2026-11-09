// docs/dev/history/technical-design-writing-help.md §1.1 (bursts), §1.3 (completion).
import {buildKnownTagIndex} from '../../../src/domain/writing/knownTags';
import {applyCompletion, completions, unfinishedTagAt} from '../../../src/domain/writing/completion';
import {completionSpelling, fixSpelling} from '../../../src/domain/writing/tagCase';
import {insertedSpan, isBurst, tagsEndedBy} from '../../../src/domain/writing/insertion';

describe('insertedSpan', () => {
  it('finds text inserted at the end, in the middle and at the start', () => {
    expect(insertedSpan('stand-up', 'stand-up #DaiIy')).toEqual({start: 8, end: 15});
    expect(insertedSpan('call  today', 'call #lena today')).toEqual({start: 5, end: 10});
    expect(insertedSpan('today', 'call today')).toEqual({start: 0, end: 5});
  });

  it('finds a replaced range by its new text', () => {
    expect(insertedSpan('call #Iena', 'call #lena')).toEqual({start: 6, end: 7});
  });

  it('is null for a deletion or no change', () => {
    expect(insertedSpan('call #lena', 'call #len')).toBeNull();
    expect(insertedSpan('same', 'same')).toBeNull();
  });

  it('never lets the suffix overlap the prefix on repeated letters', () => {
    expect(insertedSpan('aa', 'aaa')).toEqual({start: 2, end: 3});
  });
});

describe('isBurst', () => {
  it('is a burst from two characters on', () => {
    expect(isBurst({start: 0, end: 2})).toBe(true);
    expect(isBurst({start: 0, end: 1})).toBe(false);
    expect(isBurst(null)).toBe(false);
  });
});

describe('tagsEndedBy', () => {
  it('returns the tag a typed space or punctuation ends', () => {
    expect(tagsEndedBy('call #Iena ', {start: 10, end: 11})).toEqual([{start: 5, end: 10}]);
    expect(tagsEndedBy('call #Iena,', {start: 10, end: 11})).toEqual([{start: 5, end: 10}]);
  });

  it('returns nothing while a word goes on, after a burst, or without a tag', () => {
    expect(tagsEndedBy('call #Ien', {start: 8, end: 9})).toEqual([]);
    expect(tagsEndedBy('call #Iena x', {start: 10, end: 12})).toEqual([]);
    expect(tagsEndedBy('call lena ', {start: 9, end: 10})).toEqual([]);
  });
});

describe('completion', () => {
  const index = buildKnownTagIndex({
    setupTags: [],
    abbrevs: [{tag: 'atr', name: 'Team offsite'}],
    counterparts: [],
    contextTags: [],
    reservedTags: [],
    recentTags: ['sparring/lena'],
    usedTags: [
      {tag: 'sparring', date: ''},
      {tag: 'sparring/lena', date: ''},
      {tag: 'sparring/sam', date: '2026-10-01'},
      {tag: 'retro', date: ''},
    ],
    threadTypes: ['sparring'],
  });

  it('finds the unfinished tag at the cursor', () => {
    expect(unfinishedTagAt('call #spa', 9)).toEqual({start: 5, end: 9, token: 'spa'});
    expect(unfinishedTagAt('#101/', 5)).toEqual({start: 0, end: 5, token: '101/'});
    expect(unfinishedTagAt('call #spa x', 9)).toEqual({start: 5, end: 9, token: 'spa'});
  });

  it('finds none inside a word, after a space or in C#', () => {
    expect(unfinishedTagAt('call #spa', 7)).toBeNull();
    expect(unfinishedTagAt('call #spa ', 10)).toBeNull();
    expect(unfinishedTagAt('C#5', 3)).toBeNull();
    expect(unfinishedTagAt('#', 1)).toBeNull();
  });

  it('offers known tags starting with the token, never the token itself (scenario 9)', () => {
    expect(completions('spa', index).map(t => t.tag)).toEqual(['sparring/Lena', 'sparring', 'sparring/Sam']);
    expect(completions('sparring', index).map(t => t.tag)).toEqual(['sparring/Lena', 'sparring/Sam']);
  });

  it('keeps what was written and adds lower case', () => {
    expect(completions('Ret', index)).toEqual([{tag: 'Retro', label: '#Retro'}]);
    expect(completions('ret', index)).toEqual([{tag: 'retro', label: '#retro'}]);
    expect(completions('RET', index)).toEqual([{tag: 'RETro', label: '#RETro'}]);
  });

  it('writes an abbreviation upper case, with its Project/Area (scenario 10)', () => {
    expect(completions('at', index)).toEqual([{tag: 'ATR', label: '#ATR', name: 'Team offsite'}]);
  });

  it('offers a type\'s subtags as /name, counterparts upper case unless started (§10.4)', () => {
    expect(completions('sparring/', index)).toEqual([
      {tag: 'sparring/Lena', label: '/Lena'},
      {tag: 'sparring/Sam', label: '/Sam'},
    ]);
    expect(completions('Sparring/s', index)).toEqual([{tag: 'Sparring/sam', label: '/sam'}]);
    expect(completions('workshop/', index, {loops: ['workshop/offsite'], counterparts: []})).toEqual([{tag: 'workshop/offsite', label: '/offsite'}]);
    // A loop is offered where it is active, not elsewhere.
    expect(completions('workshop/', index)).toEqual([]);
  });

  it('puts the place\'s loops first and offers its unused counterparts after the used ones', () => {
    const scope = {loops: ['workshop/offsite'], counterparts: ['jordan', 'lena']};
    expect(completions('w', index, scope).map(c => c.tag)).toEqual(['workshop/offsite']);
    expect(completions('sparring/', index, scope).map(c => c.label)).toEqual(['/Lena', '/Sam', '/Jordan']);
    expect(completions('sparring/j', index, scope).map(c => c.label)).toEqual(['/j' + 'ordan']);
  });

  it('offers up to four subtags', () => {
    const scope = {loops: [], counterparts: ['a1', 'a2', 'a3', 'a4', 'a5']};
    expect(completions('sparring/', index, scope)).toHaveLength(4);
  });

  it('replaces the unfinished tag and adds a space', () => {
    expect(applyCompletion('call #spa', {start: 5, end: 9}, 'sparring')).toEqual({text: 'call #sparring ', cursor: 15});
    expect(applyCompletion('call #spa today', {start: 5, end: 9}, 'sparring')).toEqual({text: 'call #sparring today', cursor: 15});
  });
});

describe('spelling (domain/writing/tagCase.ts)', () => {
  const index = {isAbbrev: (t: string) => t.toLowerCase() === 'gr', isThreadType: (t: string) => t === '101'};

  it('fixes keep the first letter\'s case and a segment that only differs in case', () => {
    expect(fixSpelling('DaiIy', 'daily', index)).toBe('Daily');
    expect(fixSpelling('daiiy', 'daily', index)).toBe('daily');
    expect(fixSpelling('IENA', 'lena', index)).toBe('Lena');
    expect(fixSpelling('1o1/Mieke', '101/Mieke', index)).toBe('101/Mieke');
    expect(fixSpelling('9r', 'gr', index)).toBe('GR');
  });

  it('completions keep the written letters, abbreviations upper case, a new counterpart capitalised', () => {
    expect(completionSpelling('Spa', 'sparring', index)).toBe('Sparring');
    expect(completionSpelling('5pa', 'sparring', index)).toBe('sparring');
    expect(completionSpelling('g', 'gr', index)).toBe('GR');
    expect(completionSpelling('101/', '101/mieke', index)).toBe('101/Mieke');
    expect(completionSpelling('101/m', '101/mieke', index)).toBe('101/mieke');
  });
});

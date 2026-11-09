// docs/dev/history/technical-design-writing-help.md §1.1 (bursts), §1.3 (completion).
import {buildKnownTagIndex} from '../../../src/domain/writing/knownTags';
import {applyCompletion, completions, unfinishedTagAt} from '../../../src/domain/writing/completion';
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
    usedTags: [{tag: 'sparring', date: ''}, {tag: 'sparring/lena', date: ''}, {tag: 'sparring/sam', date: '2026-10-01'}],
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
    expect(completions('spa', index).map(t => t.tag)).toEqual(['sparring/lena', 'sparring', 'sparring/sam']);
    expect(completions('sparring', index).map(t => t.tag)).toEqual(['sparring/lena', 'sparring/sam']);
  });

  it('offers the counterparts after type/, most recent first', () => {
    expect(completions('sparring/', index)).toEqual([{tag: 'sparring/lena'}, {tag: 'sparring/sam'}]);
  });

  it('shows the Project/Area name of an abbreviation (scenario 10)', () => {
    expect(completions('at', index)).toEqual([{tag: 'atr', name: 'Team offsite'}]);
  });

  it('replaces the unfinished tag and adds a space', () => {
    expect(applyCompletion('call #spa', {start: 5, end: 9}, 'sparring')).toEqual({text: 'call #sparring ', cursor: 15});
    expect(applyCompletion('call #spa today', {start: 5, end: 9}, 'sparring')).toEqual({text: 'call #sparring today', cursor: 15});
  });
});

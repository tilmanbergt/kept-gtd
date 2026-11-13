// domain/writing/starters.ts and the starter states of stripContent (docs/dev/history/technical-design-calmer-screens.md §3.3).
import {createNoteSetup, NoteSetup} from '../../../src/domain/noteSetups';
import {insertStarter, starterOptions, startersOffered} from '../../../src/domain/writing/starters';
import {stripContent} from '../../../src/domain/writing/stripContent';

const setup = (id: string, kind: 'thread' | 'loop', tags: string[], enabled = true): NoteSetup => ({...createNoteSetup(id, kind), tags, enabled});
const setups = [
  setup('1', 'thread', ['sparring', 'retro']),
  setup('2', 'loop', ['offsite']),
  setup('3', 'thread', ['coaching'], false),
  setup('4', 'thread', ['oneonone']),
  setup('5', 'thread', ['board']),
  setup('6', 'thread', ['guild']),
];

describe('starterOptions', () => {
  it('lists the first tag of the first three enabled setups of a kind, in order', () => {
    expect(starterOptions(setups, 'thread')).toEqual([
      {tag: 'sparring', insert: '#sparring/'},
      {tag: 'oneonone', insert: '#oneonone/'},
      {tag: 'board', insert: '#board/'},
    ]);
    expect(starterOptions(setups, 'loop')).toEqual([{tag: 'offsite', insert: '#offsite/'}]);
  });
  it('offers Thread and Loop only where a setup of that kind exists, Paste with clipboard text', () => {
    expect(startersOffered(setups, false)).toEqual({thread: true, loop: true, paste: false});
    expect(startersOffered([setups[0]], true)).toEqual({thread: true, loop: false, paste: true});
  });
});

describe('insertStarter', () => {
  it('inserts at the cursor, with a space after a word', () => {
    expect(insertStarter('', null, '#sparring/')).toEqual({text: '#sparring/', cursor: 10});
    expect(insertStarter('Talk', 4, '#sparring/')).toEqual({text: 'Talk #sparring/', cursor: 15});
    expect(insertStarter('Talk ', 5, '#sparring/')).toEqual({text: 'Talk #sparring/', cursor: 15});
  });
});

describe('stripContent with starters', () => {
  const base = {field: 'text' as const, fixes: [], moment: null, showClipboard: false};
  const starters = {thread: true, loop: true, paste: false};
  it('an empty title shows the starters; any text the clipboard buttons', () => {
    expect(stripContent({...base, value: '', starters})).toEqual({kind: 'starters', ...starters});
    expect(stripContent({...base, value: 'Talk', starters})).toEqual({kind: 'clipboard'});
  });
  it('without starters (edit mode) or with none offered: the clipboard buttons', () => {
    expect(stripContent({...base, value: '', starters: null})).toEqual({kind: 'clipboard'});
    expect(stripContent({...base, value: '', starters: {thread: false, loop: false, paste: false}})).toEqual({kind: 'clipboard'});
  });
  it('the starter list is a moment', () => {
    const moment = {kind: 'starterList' as const, options: [{tag: 'sparring', insert: '#sparring/'}]};
    expect(stripContent({...base, value: '', starters, moment})).toEqual(moment);
  });
});

// docs/dev/history/technical-design-quickadd-redesign.md §3.1, §3.2, §7: the text strip's Suggest
// view (width filling, order, no duplicates), the resting views of stripContent, and oneLine.
import {oneLine} from '../../../src/domain/writing/insertion';
import {stripContent} from '../../../src/domain/writing/stripContent';
import {suggestButtonDp, suggestLabel, suggestOptions} from '../../../src/domain/writing/suggestOptions';
import {composeTaskText} from '../../../src/domain/quickAddCompose';

const base = {text: '', kind: 'task' as const, thisFile: false, recentTags: ['garden', 'lena', 'next'], abbrevs: [{tag: 'GR', name: 'Garden renovation'}]};
const labels = (o: ReturnType<typeof suggestOptions>) => o.map(suggestLabel);

describe('suggestOptions', () => {
  it('offers This file, #next and #someday, recent tags, then abbreviations', () => {
    expect(labels(suggestOptions({...base, thisFile: true}, 2000))).toEqual(['📎 This file', '#next', '#someday', '#garden', '#lena', '#GR']);
  });

  it('leaves out tags already in the text and never offers one twice', () => {
    expect(labels(suggestOptions({...base, text: 'Water the beds #garden #someday'}, 2000))).toEqual(['#next', '#lena', '#GR']);
  });

  it('offers #next and #someday only for a todo', () => {
    expect(labels(suggestOptions({...base, kind: 'meeting'}, 2000))).toEqual(['#garden', '#lena', '#next', '#GR']);
  });

  it('stops where the strip is full', () => {
    const width = 80 + suggestButtonDp('#next') + suggestButtonDp('#someday');
    expect(labels(suggestOptions(base, width))).toEqual(['#next', '#someday']);
    expect(suggestOptions(base, 50)).toEqual([]);
  });

  it('keeps the abbreviation\'s place name for the button', () => {
    expect(suggestOptions({...base, recentTags: []}, 2000).find(o => o.kind === 'tag' && o.tag === 'GR')).toEqual({kind: 'tag', tag: 'GR', name: 'Garden renovation'});
  });
});

describe('stripContent resting views', () => {
  const state = {field: 'text' as const, value: '', fixes: [], moment: null, showClipboard: false};

  it('shows Suggest with the starters on an empty field, Clipboard when switched', () => {
    const suggest = [{kind: 'tag' as const, tag: 'next'}];
    expect(stripContent({...state, starters: {thread: true, loop: false, paste: true}, suggest, view: 'suggest'})).toEqual({
      kind: 'suggest',
      thread: true,
      loop: false,
      paste: true,
      options: suggest,
    });
    expect(stripContent({...state, suggest, view: 'clipboard'})).toEqual({kind: 'clipboard'});
  });

  it('offers no starters once there is text', () => {
    expect(stripContent({...state, value: 'Retro', starters: {thread: true, loop: true, paste: true}, suggest: [], view: 'suggest'})).toEqual({
      kind: 'suggest',
      thread: false,
      loop: false,
      paste: false,
      options: [],
    });
  });

  it('keeps the fixes and moments first', () => {
    const fixes = [{written: 'daiiy', suggestion: 'daily'}];
    expect(stripContent({...state, value: '#daiiy', fixes, suggest: [], view: 'suggest'}).kind).toBe('fixes');
  });

  it('keeps the starters or the clipboard where there is no Suggest view', () => {
    expect(stripContent({...state, starters: {thread: true, loop: false, paste: false}})).toEqual({kind: 'starters', thread: true, loop: false, paste: false});
    expect(stripContent({...state, value: 'x'})).toEqual({kind: 'clipboard'});
  });
});

describe('oneLine', () => {
  it('turns newlines into one space', () => {
    expect(oneLine('Call Tom\nabout the fence')).toBe('Call Tom about the fence');
    expect(oneLine('Call Tom  \r\n  about it')).toBe('Call Tom about it');
    expect(oneLine('no break')).toBe('no break');
  });
});

describe('composeTaskText in the form', () => {
  const fields = {text: 'Order soil #someday', flowState: null, waitingOnText: '', dueDate: ''};

  it('keeps a typed flow tag when no flow state is chosen', () => {
    expect(composeTaskText({...fields, keepTypedFlow: true})).toBe('Order soil #someday');
  });

  it('replaces it with a chosen one, and strips it in the capture panel as before', () => {
    expect(composeTaskText({...fields, flowState: 'waiting-for', waitingOnText: 'Lena', keepTypedFlow: true})).toBe('Order soil #wf/lena');
    expect(composeTaskText(fields)).toBe('Order soil');
  });
});

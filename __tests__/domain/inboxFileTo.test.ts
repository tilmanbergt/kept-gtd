// domain/inboxFileTo.ts (docs/dev/history/technical-design-calmer-screens.md §3.7, §6 scenario 17).
import {inboxFileTo, isTopicTag} from '../../src/domain/inboxFileTo';
import {FileToItem} from '../../src/domain/captureFileTo';
import {InboxListEntry, nextInboxRow} from '../../src/domain/inboxCount';
import {projectNameFromItem} from '../../src/domain/projectFromItem';

const place = (name: string, abbrev: string | null, status: FileToItem['status'] = 'active'): FileToItem => ({kind: 'project', name, path: `/p/${name}`, abbrev, status});
const GR = place('Garden renovation', 'GR');
const TO = place('Team offsite', 'TO');
const CO = place('Coaching', 'Co');
const HOME = place('Home', null);
const OLD = place('Old house', 'OH', 'on-hold');
const places = [GR, TO, CO, HOME, OLD];
const owners = new Map([
  ['lena', new Map([['/p/Team offsite', 3], ['/p/Coaching', 1]])],
  ['next', new Map([['/p/Home', 9]])],
  ['oh', new Map([['/p/Old house', 5]])],
]);

describe('inboxFileTo', () => {
  it('ranks an abbreviation tag first, then owners using the item\'s tags, then recent places; four at most', () => {
    expect(inboxFileTo({tags: ['gr', 'lena'], places, tagOwners: owners, recent: ['/p/Home', '/p/Garden renovation']})).toEqual([GR, TO, CO, HOME]);
    expect(inboxFileTo({tags: ['lena'], places, tagOwners: owners, recent: [], limit: 1})).toEqual([TO]);
  });
  it('ignores state tags and offers only Active places', () => {
    expect(inboxFileTo({tags: ['next', 'oh'], places, tagOwners: owners, recent: ['/p/Old house']})).toEqual([]);
    expect(isTopicTag('wf/lena')).toBe(false);
    expect(isTopicTag('sparring/jordan')).toBe(true);
  });
});

describe('nextInboxRow', () => {
  const order: InboxListEntry[] = [{type: 'task', index: 0}, {type: 'task', index: 2}, {type: 'meeting', index: 0}];
  it('is the row after, its index as after the move; else the one before; else none', () => {
    expect(nextInboxRow(order, {type: 'task', index: 0})).toEqual({type: 'task', index: 1});
    expect(nextInboxRow(order, {type: 'task', index: 2})).toEqual({type: 'meeting', index: 0});
    expect(nextInboxRow(order, {type: 'meeting', index: 0})).toEqual({type: 'task', index: 2});
    expect(nextInboxRow([{type: 'task', index: 0}], {type: 'task', index: 0})).toBeNull();
  });
});

describe('projectNameFromItem', () => {
  it('drops the tags and a leading Idea: / Idee:', () => {
    expect(projectNameFromItem('Idea: Herb spiral #garden')).toBe('Herb spiral');
    expect(projectNameFromItem('Idee:Kräuterspirale #GR #next')).toBe('Kräuterspirale');
    expect(projectNameFromItem('Fix the  gate')).toBe('Fix the gate');
  });
});

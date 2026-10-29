/** Contexts (docs/dev/history/technical-design-time-and-place.md §3.3, §6). */
import {
  activeContext,
  ContextDef,
  contextMatcher,
  contextSummary,
  hiddenAddText,
  hiddenLineText,
  newContext,
  nextCountOf,
  renameItemInContexts,
  minMinutesOf,
  tallyHidden,
  toggleEntry,
  unknownContextEntries,
} from '../../src/domain/contexts';
import {checkUnknownContextEntries} from '../../src/domain/integrityCheck';
import {deriveMeetingFields} from '../../src/domain/markdown';
import {task} from '../../test-helpers/fixtures';

const TODAY = '2026-10-14';
const team = {kind: 'area' as const, name: 'Team', area: null};
const tender = {kind: 'project' as const, name: 'Tender', area: 'Team'};
const garden = {kind: 'area' as const, name: 'Garden', area: null};
const solo = {kind: 'project' as const, name: 'Solo', area: null};
const ctx = (extra: Partial<ContextDef>): ContextDef => ({id: 'c1', name: 'Work', shows: [], hides: [], outsideMeetings: 'dim', ...extra});
const work = ctx({shows: [{kind: 'item', itemKind: 'area', name: 'Team'}, {kind: 'tag', tag: 'retro'}]});

describe('contextMatcher', () => {
  it('Everything shows all', () => {
    const m = contextMatcher(null);
    expect(m.itemShown(garden)).toBe(true);
    expect(m.taskShown(garden, task('x #next'), TODAY)).toBe(true);
    expect(m.meetingState(garden, deriveMeetingFields('x'))).toBe('shown');
  });
  it('an Area entry matches the Area and its Projects; others only under Everything (Q1)', () => {
    const m = contextMatcher(work);
    expect(m.itemShown(team)).toBe(true);
    expect(m.itemShown(tender)).toBe(true);
    expect(m.itemShown(garden)).toBe(false);
    expect(m.itemShown(solo)).toBe(false);
  });
  it('a tag entry matches the tag and tags nested under it', () => {
    const m = contextMatcher(work);
    expect(m.taskShown(garden, task('Prep #retro/demand #next'), TODAY)).toBe(true);
    expect(m.taskShown(garden, task('Prep #retrospective #next'), TODAY)).toBe(false);
  });
  it('the Inbox always shows; due todos follow the context', () => {
    const m = contextMatcher(ctx({hides: [{kind: 'item', itemKind: 'area', name: 'Garden'}]}));
    expect(m.taskShown('inbox', task('Call #next'), TODAY)).toBe(true);
    expect(m.taskShown(garden, task('Water', {dueDate: '2026-10-14'}), TODAY)).toBe(false);
    expect(m.taskShown(garden, task('Old', {dueDate: '2026-10-01'}), TODAY)).toBe(false);
    expect(m.taskShown(garden, task('Later', {dueDate: '2026-10-20'}), TODAY)).toBe(false);
  });
  it('Hides wins over Shows', () => {
    const m = contextMatcher(ctx({shows: [{kind: 'item', itemKind: 'area', name: 'Team'}], hides: [{kind: 'tag', tag: 'computer'}]}));
    expect(m.taskShown(team, task('Report #computer #next'), TODAY)).toBe(false);
    expect(m.taskShown(team, task('Call #next'), TODAY)).toBe(true);
    expect(contextMatcher(ctx({shows: [{kind: 'item', itemKind: 'project', name: 'Tender'}], hides: [{kind: 'item', itemKind: 'area', name: 'Team'}]})).itemShown(tender)).toBe(false);
  });
  it('an empty Shows list shows everything but Hides ("everything but work")', () => {
    const m = contextMatcher(ctx({hides: [{kind: 'item', itemKind: 'area', name: 'Team'}]}));
    expect(m.itemShown(garden)).toBe(true);
    expect(m.itemShown(solo)).toBe(true);
    expect(m.itemShown(tender)).toBe(false);
  });
  it('meetings outside are dimmed, or shown as usual; never hidden; the Inbox shows', () => {
    const m = contextMatcher(work);
    expect(m.meetingState(team, deriveMeetingFields('Steering'))).toBe('shown');
    expect(m.meetingState(garden, deriveMeetingFields('Neighbour chat'))).toBe('dimmed');
    expect(m.meetingState(garden, deriveMeetingFields('Retro #retro'))).toBe('shown');
    expect(m.meetingState('inbox', deriveMeetingFields('Dentist'))).toBe('shown');
    expect(contextMatcher({...work, outsideMeetings: 'show'}).meetingState(garden, deriveMeetingFields('x'))).toBe('shown');
  });
  it('an item entry naming no item matches nothing', () => {
    const m = contextMatcher(ctx({shows: [{kind: 'item', itemKind: 'area', name: 'Gone'}]}));
    expect(m.itemShown(garden)).toBe(false);
    expect(m.taskShown('inbox', task('x'), TODAY)).toBe(true);
  });
});

describe('minMinutesOf', () => {
  it('the context\'s own threshold, else Everything\'s, else 1 h a week · 2 h a month', () => {
    expect(minMinutesOf({...work, minMinutes: {week: 30, month: 60}}, {week: 120, month: 240}, 'week')).toBe(30);
    expect(minMinutesOf(work, {week: 120, month: 240}, 'month')).toBe(240);
    expect(minMinutesOf(null, undefined, 'week')).toBe(60);
    expect(minMinutesOf(null, null, 'month')).toBe(120);
  });
});

describe('activeContext', () => {
  it('finds the stored id; empty or unknown is Everything', () => {
    expect(activeContext({contexts: [work], activeContextId: 'c1'})).toBe(work);
    expect(activeContext({contexts: [work], activeContextId: ''})).toBeNull();
    expect(activeContext({contexts: [work], activeContextId: 'nope'})).toBeNull();
    expect(activeContext({})).toBeNull();
  });
});

describe('tallyHidden and the hidden line', () => {
  it('counts todos, the distinct loops and threads among them and the due ones', () => {
    const hidden = [task('a #writing/novel'), task('b #writing/novel', {dueDate: TODAY}), task('c #sparring/jordan', {dueDate: '2026-10-01'}), task('d #other/x', {dueDate: '2026-10-20'}), task('e')].map(t => ({task: t}));
    expect(tallyHidden(hidden, {loopKinds: ['writing'], threadTypes: ['sparring']}, TODAY)).toEqual({todos: 5, loops: 1, threads: 1, items: 0, due: 2});
  });
  it('reads "Hidden by Work: 9 todos · 2 loops · 1 thread · 3 due!"; nothing hidden is no line', () => {
    expect(hiddenLineText('Work', {todos: 9, loops: 2, threads: 1, items: 0, due: 3})).toBe('Hidden by Work: 9 todos · 2 loops · 1 thread · 3 due!');
    expect(hiddenLineText('Home', {todos: 0, loops: 0, threads: 0, items: 1, due: 0}, {one: 'area', many: 'areas'})).toBe('Hidden by Home: 1 area');
    expect(hiddenLineText('Home', {todos: 0, loops: 0, threads: 0, items: 0, due: 0})).toBeNull();
  });
  it('the Quick Add notice', () => expect(hiddenAddText('Team', 'Home')).toBe('Saved to Team · hidden by Home'));
});

describe('editing contexts', () => {
  it('new ids, toggling entries, summary', () => {
    const fresh = newContext([work], 'Café');
    expect(fresh.id).toBe('c2');
    const shows = toggleEntry(fresh.shows, {kind: 'tag', tag: 'reading'});
    expect(shows).toEqual([{kind: 'tag', tag: 'reading'}]);
    expect(toggleEntry(shows, {kind: 'tag', tag: 'reading'})).toEqual([]);
    expect(contextSummary({...fresh, shows, hides: [{kind: 'tag', tag: 'computer'}]})).toBe('Shows #reading · hides #computer');
    expect(contextSummary(fresh)).toBe('Shows everything');
  });
  it('a renamed item is renamed in every context; nothing named returns the same array', () => {
    const contexts = [work];
    const renamed = renameItemInContexts(contexts, 'area', 'Team', 'Team AG');
    expect(renamed[0].shows[0]).toEqual({kind: 'item', itemKind: 'area', name: 'Team AG'});
    expect(renameItemInContexts(contexts, 'project', 'Team', 'x')).toBe(contexts);
  });
  it('unknown item entries are listed, and reported by the Integrity Check', () => {
    expect(unknownContextEntries([work], [garden])).toEqual([{context: 'Work', entry: {kind: 'item', itemKind: 'area', name: 'Team'}}]);
    expect(unknownContextEntries([work], [team])).toEqual([]);
    const findings = checkUnknownContextEntries([work], [{itemKind: 'area', itemPath: '/a/Garden', itemName: 'Garden', inArchive: false, area: null, abbrev: null}]);
    expect(findings.map(f => f.checkId)).toEqual(['unknownContextEntry']);
    expect(findings[0].message).toContain('Area "Team"');
  });
});

describe('nextCountOf', () => {
  const gardenItem = {kind: 'area' as const, name: 'Garden', area: null, status: 'active', tasks: [task('Buy bulbs #next'), task('Weed'), task('Old #next', {done: true})]};
  const office = {kind: 'area' as const, name: 'Office', area: null, status: 'active', tasks: [task('Send offer #next')]};
  const paused = {kind: 'area' as const, name: 'Paused', area: null, status: 'on-hold', tasks: [task('Later #next')]};
  const home: ContextDef = {id: 'h', name: 'Home', shows: [{kind: 'item', itemKind: 'area', name: 'Garden'}], hides: [], outsideMeetings: 'dim'};
  it('counts the open #next todos of the Active items a context shows; Everything counts all', () => {
    expect(nextCountOf(home, [gardenItem, office, paused], TODAY)).toBe(1);
    expect(nextCountOf(null, [gardenItem, office, paused], TODAY)).toBe(2);
  });
});

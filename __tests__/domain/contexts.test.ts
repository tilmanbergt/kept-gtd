/** Contexts (docs/dev/history/technical-design-contexts-tags.md §2.1, §6). */
import {
  activeContext,
  ContextDef,
  contextMatcher,
  contextChanged,
  contextSentence,
  hiddenAddText,
  hiddenLineText,
  newContext,
  normalizeContextTag,
  nextCountOf,
  renameItemInContexts,
  storedContext,
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
    expect(m.taskShown(garden, task('x #next'))).toBe(true);
    expect(m.meetingState(garden, deriveMeetingFields('x'))).toBe('shown');
  });
  it('an Area entry matches the Area and its Projects; others only under Everything', () => {
    const m = contextMatcher(work);
    expect(m.itemShown(team)).toBe(true);
    expect(m.itemShown(tender)).toBe(true);
    expect(m.itemShown(garden)).toBe(false);
    expect(m.itemShown(solo)).toBe(false);
  });
  it('a tag entry matches the tag and tags nested under it', () => {
    const m = contextMatcher(work);
    expect(m.taskShown(garden, task('Prep #retro/demand #next'))).toBe(true);
    expect(m.taskShown(garden, task('Prep #retrospective #next'))).toBe(false);
  });
  it('the Inbox always shows; due todos follow the context', () => {
    const m = contextMatcher(ctx({hides: [{kind: 'item', itemKind: 'area', name: 'Garden'}]}));
    expect(m.taskShown('inbox', task('Call #next'))).toBe(true);
    expect(m.taskShown(garden, task('Water', {dueDate: '2026-10-14'}))).toBe(false);
    expect(m.taskShown(garden, task('Old', {dueDate: '2026-10-01'}))).toBe(false);
    expect(m.taskShown(garden, task('Later', {dueDate: '2026-10-20'}))).toBe(false);
  });
  it('Except wins over Show', () => {
    const m = contextMatcher(ctx({shows: [{kind: 'item', itemKind: 'area', name: 'Team'}], hides: [{kind: 'tag', tag: 'computer'}]}));
    expect(m.taskShown(team, task('Report #computer #next'))).toBe(false);
    expect(m.taskShown(team, task('Call #next'))).toBe(true);
    expect(contextMatcher(ctx({shows: [{kind: 'item', itemKind: 'project', name: 'Tender'}], hides: [{kind: 'item', itemKind: 'area', name: 'Team'}]})).itemShown(tender)).toBe(false);
  });
  it('an empty Show shows everything but Except ("everything but work")', () => {
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
    expect(m.taskShown('inbox', task('x'))).toBe(true);
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
  it('new ids and toggling entries', () => {
    const fresh = newContext([work], 'Café');
    expect(fresh.id).toBe('c2');
    const shows = toggleEntry(fresh.shows, {kind: 'tag', tag: 'reading'});
    expect(shows).toEqual([{kind: 'tag', tag: 'reading'}]);
    expect(toggleEntry(shows, {kind: 'tag', tag: 'reading'})).toEqual([]);
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
    const findings = checkUnknownContextEntries([work], [{itemKind: 'area', itemPath: '/a/Garden', itemName: 'Garden', inArchive: false, area: null, abbrev: null, tagCounts: {}}]);
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
    expect(nextCountOf(home, [gardenItem, office, paused])).toBe(1);
    expect(nextCountOf(null, [gardenItem, office, paused])).toBe(2);
  });
});

const area = (name: string) => ({kind: 'item' as const, itemKind: 'area' as const, name});
const tag = (t: string) => ({kind: 'tag' as const, tag: t});
const home = {kind: 'area' as const, name: 'Home', area: null};

describe('Show has two parts, Except wins', () => {
  const both = ctx({shows: [area('Team'), tag('computer')]});
  it.each([
    ['nothing in Show: everything', ctx({}), garden, ['x'], true],
    ['Where only: the place', ctx({shows: [area('Team')]}), team, [], true],
    ['Where only: not elsewhere', ctx({shows: [area('Team')]}), garden, ['computer'], false],
    ['What only: the tag anywhere', ctx({shows: [tag('computer')]}), garden, ['computer'], true],
    ['What only: not without the tag', ctx({shows: [tag('computer')]}), team, ['phone'], false],
    ['either: a place without the tag', both, team, ['phone'], true],
    ['either: the tag elsewhere', both, garden, ['computer'], true],
    ['either: neither', both, garden, ['phone'], false],
    ['only inside: the tag in the place', {...both, onlyInPlaces: true}, team, ['computer'], true],
    ['only inside: the tag elsewhere', {...both, onlyInPlaces: true}, garden, ['computer'], false],
    ['only inside: the place without the tag', {...both, onlyInPlaces: true}, team, ['phone'], false],
    ['only inside with one part empty: no effect', ctx({shows: [tag('computer')], onlyInPlaces: true}), garden, ['computer'], true],
    ['Except a tag beats the place', ctx({shows: [area('Team')], hides: [tag('computer')]}), team, ['computer'], false],
    ['Except a place beats the tag', ctx({shows: [tag('computer')], hides: [area('Garden')]}), garden, ['computer'], false],
    ['Except only: the rest shows', ctx({hides: [tag('computer')]}), garden, ['phone'], true],
  ])('%s', (_name, c, item, tags, expected) => {
    expect(contextMatcher(c).taskShown(item, {tags})).toBe(expected);
  });
});

describe('Project and Area rows', () => {
  const content = (item: {kind: 'area' | 'project'; name: string; area: string | null}, tasks: string[], meetings: Array<{tags: string[]; date: string; cancelled?: boolean}> = []) => ({
    ...item,
    tasks: tasks.map(t => task(t)),
    meetings: meetings.map(m => ({cancelled: false, ...m})),
  });
  const errands = ctx({shows: [tag('errand')]});
  it('a tag-only context lists the places holding an open todo with the tag', () => {
    const m = contextMatcher(errands, [content(garden, ['Buy bulbs #errand']), content(team, ['Report']), content(home, [])], TODAY);
    expect(m.itemShown(garden)).toBe(true);
    expect(m.itemShown(team)).toBe(false);
  });
  it('done or cancelled todos keep no row', () => {
    const items = [{...garden, tasks: [task('Bulbs #errand', {done: true}), task('Seeds #errand', {cancelled: true})], meetings: []}];
    expect(contextMatcher(errands, items, TODAY).itemShown(garden)).toBe(false);
  });
  it('an Area shows through its Project; the Project too', () => {
    const shed = {kind: 'project' as const, name: 'Shed', area: 'Garden'};
    const m = contextMatcher(errands, [content(garden, []), content(shed, ['Paint #errand'])], TODAY);
    expect(m.itemShown(garden)).toBe(true);
    expect(m.itemShown(shed)).toBe(true);
  });
  it('a meeting from today on keeps the row; a past or cancelled one does not', () => {
    const coaching = ctx({shows: [tag('jf')]});
    const lead = {kind: 'project' as const, name: 'Leadership', area: null};
    expect(contextMatcher(coaching, [content(lead, [], [{tags: ['jf/anna'], date: '2026-10-20'}])], TODAY).itemShown(lead)).toBe(true);
    expect(contextMatcher(coaching, [content(lead, [], [{tags: ['jf/anna'], date: TODAY}])], TODAY).itemShown(lead)).toBe(true);
    expect(contextMatcher(coaching, [content(lead, [], [{tags: ['jf/anna'], date: '2026-09-14'}])], TODAY).itemShown(lead)).toBe(false);
    expect(contextMatcher(coaching, [content(lead, [], [{tags: ['jf/anna'], date: '2026-10-20', cancelled: true}])], TODAY).itemShown(lead)).toBe(false);
  });
  it('the item itself passing is enough; Except beats its content', () => {
    expect(contextMatcher(ctx({shows: [area('Team')]}), [content(team, [])], TODAY).itemShown(team)).toBe(true);
    expect(contextMatcher(ctx({shows: [tag('errand')], hides: [area('Garden')]}), [content(garden, ['Bulbs #errand'])], TODAY).itemShown(garden)).toBe(false);
  });
  it('an item the matcher was not given falls back to its own entries', () => {
    expect(contextMatcher(errands, [], TODAY).itemShown(garden)).toBe(false);
    expect(contextMatcher(ctx({shows: [area('Garden')]}), [], TODAY).itemShown(garden)).toBe(true);
  });
});

describe('contextSentence', () => {
  const kinds = {loopKinds: ['read'], threadTypes: ['jf']};
  const places = ['Work', 'Coaching', 'Home'].map(area);
  it.each([
    ['Everything', null, 'Show everything'],
    ['nothing named', ctx({}), 'Show everything'],
    ['places', ctx({shows: places}), 'Show Work, Coaching and Home'],
    ['a tag', ctx({shows: [tag('computer')]}), 'Show #computer everywhere'],
    ['tags with or', ctx({shows: [tag('computer'), tag('phone')]}), 'Show #computer or #phone everywhere'],
    ['both, switch off', ctx({shows: [...places, tag('computer')]}), 'Show Work, Coaching and Home, plus #computer everywhere'],
    ['both, switch on, Except a tag', ctx({shows: [...places, tag('computer')], hides: [tag('wifi')], onlyInPlaces: true}), 'Show #computer in Work, Coaching and Home except #wifi'],
    ['Except only a place', ctx({shows: [tag('computer')], hides: [area('Home')]}), 'Show #computer everywhere except in Home'],
    ['Except places and a tag', ctx({hides: [area('Home'), area('Work'), tag('computer')]}), 'Show everything except Home, Work and #computer'],
    ['long lists', ctx({shows: ['Work', 'Coaching', 'Home', 'Garden', 'Team'].map(area)}), 'Show Work, Coaching and 3 more'],
    ['roots', ctx({shows: [tag('read'), tag('jf')]}), 'Show all #read loops or all #jf threads everywhere'],
    ['the switch with one part empty', ctx({shows: [tag('read')], onlyInPlaces: true}), 'Show all #read loops everywhere'],
  ])('%s', (_name, c, expected) => expect(contextSentence(c, kinds)).toBe(expected));
});

describe('normalizeContextTag', () => {
  it.each([
    ['#Shopping', 'shopping'],
    ['  errand ', 'errand'],
    ['project/piplanning', 'project/piplanning'],
    ['', null],
    ['#', null],
    ['two words', null],
    ['next', null],
    ['due:2026-10-01', null],
    ['a#b', null],
  ])('%s', (text, expected) => expect(normalizeContextTag(text)).toBe(expected));
  it('a typed nested tag matches deeper tags', () => {
    expect(contextMatcher(ctx({shows: [tag('project/piplanning')]})).taskShown(garden, {tags: ['project/piplanning/q1']})).toBe(true);
  });
});

describe('saving from the editor', () => {
  const saved = ctx({name: 'Desk', shows: [area('Work'), tag('computer')], onlyInPlaces: true});
  it('stores a trimmed name, and the switch only while both parts are named', () => {
    expect(storedContext(ctx({name: '  '})).name).toBe('Unnamed');
    expect(storedContext(saved).onlyInPlaces).toBe(true);
    expect(storedContext({...saved, shows: [area('Work')]}).onlyInPlaces).toBeUndefined();
    expect(storedContext({...saved, onlyInPlaces: false})).not.toHaveProperty('onlyInPlaces');
  });
  it('is changed only when saving would store something else', () => {
    expect(contextChanged(saved, saved)).toBe(false);
    expect(contextChanged({...saved, name: 'Desk '}, saved)).toBe(false);
    expect(contextChanged({...saved, shows: [area('Work')], onlyInPlaces: true}, {...saved, shows: [area('Work')], onlyInPlaces: undefined})).toBe(false);
    expect(contextChanged({...saved, hides: [tag('wifi')]}, saved)).toBe(true);
    expect(contextChanged({...saved, outsideMeetings: 'show'}, saved)).toBe(true);
    expect(contextChanged({...saved, minMinutes: {week: 30, month: 60}}, saved)).toBe(true);
    expect(contextChanged(saved, undefined)).toBe(true);
  });
});

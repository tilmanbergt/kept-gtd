import {expectNotShows, expectShows, labelled, openApp, readTexts, tap, tapLabel, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {ContextDef, ContextEntry} from '../../src/domain/contexts';
import {createNoteSetup} from '../../src/domain/noteSetups';

// Contexts (docs/dev/history/technical-design-time-and-place.md §3.3, §6 scenarios 9-12). The clock stands at
// Wednesday 14.10.2026, 10:00.
const DESIGN = 'technical-design-time-and-place.md';

afterEach(() => jest.useRealTimers());

const WORK: ContextDef = {id: 'c1', name: 'Work', shows: [{kind: 'item', itemKind: 'area', name: 'Team'}], hides: [], outsideMeetings: 'dim'};
const HOME: ContextDef = {id: 'c2', name: 'Home', shows: [{kind: 'item', itemKind: 'area', name: 'Garden'}], hides: [], outsideMeetings: 'dim'};
const SETTINGS = {contexts: [WORK, HOME]};

function space(): void {
  smokeClock();
  putFile(
    areaFile('Team'),
    dataFile(
      'area',
      {
        Scope: [],
        Tasks: ['- [ ] Prepare offer #next', '- [ ] Send the report [due:: 2026-10-12]', '- [ ] Review contract #next'],
        Meetings: ['- 2026-10-14 15:00 Steering committee'],
      },
      ['dailyFocus: true', 'abbrev: AT'],
    ),
  );
  putFile(projectFile('Tender'), dataFile('project', {Scope: [], Tasks: ['- [ ] Price list'], Meetings: []}, ['area: Team', 'abbrev: TEN']));
  putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: ['- [ ] Buy bulbs #next'], Meetings: ['- 2026-10-14 17:00 Neighbour chat']}, ['dailyFocus: true', 'abbrev: GA']));
  putFile(projectFile('Shed'), dataFile('project', {Scope: [], Tasks: ['- [ ] Plan the shed'], Meetings: []}, ['area: Garden', 'abbrev: SH']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: ['- [ ] Call the plumber #next'], Meetings: []}));
}

/** The chip opens Settings → Contexts; the radio in front of `name` makes it active; then back to `tab`. */
async function chooseContext(name: string, tab = 'Daily'): Promise<void> {
  await tapLabel('Context');
  await tapLabel(`Use ${name}`);
  await tapTab(tab);
}

scenario('A context filters Daily: hidden todos, dimmed meetings, the hidden line and Show', {feature: 'Contexts', design: DESIGN}, () => {
  given('contexts Work (Area Team) and Home (Area Garden)', space);
  when('I open Daily, tap the chip in the tab bar, choose Home in Settings → Contexts and go back to Daily', async () => {
    await openApp({settings: SETTINGS});
    await tapTab('Daily');
    await chooseContext('Home');
  });
  then('the chip names Home, and the status line says so', () => {
    expectShows('Home ›');
    expectShows('Context: Home');
  });
  and('Team\'s todos are hidden, its overdue one too; Garden\'s and the Inbox show', () => {
    expectNotShows(/^Prepare offer/);
    expectNotShows(/^Send the report/);
    expectShows(/^Buy bulbs/);
    expectShows(/^Call the plumber/);
  });
  and('Team\'s meeting is still listed (dimmed), and the hidden line counts the hidden todos and warns of the due one', () => {
    expectShows(/^Steering committee/);
    expectShows('Hidden by Home: 3 todos · 1 due! ·');
  });
  when('I tap Show', () => tap('Show'));
  then('everything shows', () => {
    expectShows(/^Prepare offer/);
    expectNotShows(/^Hidden by Home/);
  });
  when('I switch to Week and back to Daily', async () => {
    await tapTab('Week');
    await tapTab('Daily');
  });
  then('Home filters again', () => {
    expectNotShows(/^Prepare offer/);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('A context filters Areas, Projects and Review; Reviewed stays global', {feature: 'Contexts', design: DESIGN}, () => {
  given('contexts Work and Home, Home active', space);
  when('I open Areas', async () => {
    await openApp({settings: {...SETTINGS, activeContextId: 'c2'}});
    await tapTab('Areas');
  });
  then('only Garden is listed, and the hidden line counts Team', () => {
    expect(readTexts().some(t => t.includes('Garden'))).toBe(true);
    expect(readTexts().some(t => t.includes('Team'))).toBe(false);
    expectShows('Hidden by Home: 1 area ·');
  });
  when('I open Review', () => tapTab('Review'));
  then('Stalled projects counts Home\'s project and "+1 in other contexts"', () => {
    expect(textsBetween('Stalled projects')[0]).toBe('1 project · +1 in other contexts');
  });
  when('I open the step', () => tap('Stalled projects'));
  then('it lists Shed and not Tender', () => {
    expect(readTexts().some(t => t.includes('Shed'))).toBe(true);
    expect(readTexts().some(t => t.includes('Tender'))).toBe(false);
  });
  when('I mark it Reviewed, choose Everything and open Review\'s overview again', async () => {
    await tap('Reviewed ›');
    await chooseContext('Everything');
    await tapTab('Review');
    await tap('Overview');
  });
  then('Stalled projects counts both and shows today\'s review: the mark is global', () => {
    const row = textsBetween('Stalled projects');
    expect(row[0]).toBe('2 projects');
    expect(row[1]).toBe('today');
  });
});

scenario('Quick Add says when the entry lands outside the context', {feature: 'Contexts', design: DESIGN}, () => {
  given('Home is active and Team has the abbreviation AT', space);
  when('I add "Prepare offer #AT" on Daily', async () => {
    await openApp({settings: {...SETTINGS, activeContextId: 'c2'}});
    await tapTab('Daily');
    await type('New task', 'Prepare the slides #AT');
    await tap(/^\+ Add to Team/);
  });
  then('it is in Team\'s file, and the status line says "Saved to Team · hidden by Home"', () => {
    expect(sectionLines(areaFile('Team'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Prepare the slides/));
    expect(readTexts().some(t => t.includes('Saved to Team · hidden by Home'))).toBe(true);
  });
});

scenario('Settings → Contexts: create Café, then choose it from the chip', {feature: 'Contexts', design: DESIGN}, () => {
  given('a space with todos tagged #reading and #computer', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Novel #reading #next', '- [ ] Backup #computer #reading #next', '- [ ] Laundry #next'], Meetings: []}, ['dailyFocus: true']));
  });
  when('I create the context "Café" with Shows #reading and Hides #computer (its Tags list)', async () => {
    await openApp();
    await tapTab('Daily');
    await tapTab('Settings');
    await tap('Contexts');
    await tap('+ New context');
    await type('e.g. Work, Home, Café', 'Café');
    await tap('Tags');
    await tap('#reading');
    await tap('Hides');
    await tap('#computer');
  });
  then('the preview counts what it shows', () => expectShows('Preview: shows 1 of 3 next todos. The Inbox always shows.'));
  when('I save', () => tap('Save'));
  then('Café is listed with its count and sentence', () => {
    expectShows('Café');
    expectShows('1 next · Show #reading everywhere except #computer');
  });
  when('I tap its radio', () => tapLabel('Use Café'));
  then('the chip names Café', () => {
    expectShows('Café ›');
    expect(labelled('Context')).not.toBeNull();
  });
});

scenario('Settings → Contexts: a context that shows one Area, named and saved from the top row', {feature: 'Contexts', design: DESIGN}, () => {
  given('the areas Home and Team, each with a next todo', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Laundry #next'], Meetings: []}));
    putFile(areaFile('Team'), dataFile('area', {Scope: [], Tasks: ['- [ ] Prepare offer #next'], Meetings: []}));
  });
  when('I create "Home" with Shows on the Area Home and tap Save', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Contexts');
    await tap('+ New context');
    await type('e.g. Work, Home, Café', 'Home');
    await tap('Home');
    await tap('Save');
  });
  then('the Areas list counts the choice and the context is listed', () => {
    expectShows('Areas 1');
    expectShows(/^Home/);
  });
  when('I tap its radio and open Daily', async () => {
    await tapLabel('Use Home');
    await tapTab('Daily');
  });
  then('Daily shows Home\'s todo and hides Team\'s', () => {
    expectShows(/^Laundry/);
    expectNotShows(/^Prepare offer/);
  });
});

// Flexible contexts (docs/dev/history/technical-design-contexts-tags.md §5).
const TAGS_DESIGN = 'technical-design-contexts-tags.md';
const area = (name: string): ContextEntry => ({kind: 'item', itemKind: 'area', name});
const tag = (t: string): ContextEntry => ({kind: 'tag', tag: t});
const named = (name: string, shows: ContextEntry[], hides: ContextEntry[] = [], extra: Partial<ContextDef> = {}): ContextDef => ({id: 'c1', name, shows, hides, outsideMeetings: 'dim', ...extra});
const active = (ctx: ContextDef, more: object = {}) => ({contexts: [ctx], activeContextId: ctx.id, ...more});
const listed = (name: string) => readTexts().some(t => t.includes(name));

/** Settings → Contexts lists `sentence` after the context's next count. */
async function expectSentence(sentence: string): Promise<void> {
  await tapTab('Settings');
  await tap('Contexts');
  expect(readTexts().some(t => t.endsWith(` next · ${sentence}`))).toBe(true);
}

scenario('A tag-only context lists the areas holding its todos', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('"Errands" shows #errand; Garden holds "Buy bulbs #errand", Team has no errand todo', () => {
    smokeClock();
    putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: ['- [ ] Buy bulbs #errand'], Meetings: []}));
    putFile(areaFile('Team'), dataFile('area', {Scope: [], Tasks: ['- [ ] Prepare offer #next'], Meetings: []}));
  });
  when('I open Areas under Errands', async () => {
    await openApp({settings: active(named('Errands', [tag('errand')]))});
    await tapTab('Areas');
  });
  then('Garden is listed, Team is not, and the hidden line counts Team', () => {
    expect(listed('Garden')).toBe(true);
    expect(listed('Team')).toBe(false);
    expectShows('Hidden by Errands: 1 area ·');
  });
});

scenario('An area is listed through its project\'s todos', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('Project Shed (Area Garden) has "Paint #errand"; Garden itself has none', () => {
    smokeClock();
    putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: ['- [ ] Weed'], Meetings: []}));
    putFile(projectFile('Shed'), dataFile('project', {Scope: [], Tasks: ['- [ ] Paint #errand'], Meetings: []}, ['area: Garden']));
    putFile(areaFile('Team'), dataFile('area', {Scope: [], Tasks: [], Meetings: []}));
  });
  when('I open Areas under Errands', async () => {
    await openApp({settings: active(named('Errands', [tag('errand')]))});
    await tapTab('Areas');
  });
  then('Garden is listed, Team is not', () => {
    expect(listed('Garden')).toBe(true);
    expect(listed('Team')).toBe(false);
  });
});

const coaching = named('Coaching', [tag('jf')]);
const leadership = (meetings: string[]) => {
  smokeClock();
  putFile(projectFile('Leadership'), dataFile('project', {Scope: [], Tasks: ['- [ ] Read the book'], Meetings: meetings}));
  putFile(projectFile('Tender'), dataFile('project', {Scope: [], Tasks: ['- [ ] Price list'], Meetings: []}));
};

scenario('An upcoming meeting keeps a project listed', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('"Coaching" shows all #jf threads; Leadership has no #jf todo, a meeting "Sparring #jf/anna" next Tuesday and one last month', () =>
    leadership(['- 2026-09-15 10:00 Sparring #jf/anna', '- 2026-10-20 10:00 Sparring #jf/anna']),
  );
  when('I open Projects under Coaching', async () => {
    await openApp({settings: active(coaching)});
    await tapTab('Projects');
  });
  then('Leadership is listed, Tender is not', () => {
    expect(listed('Leadership')).toBe(true);
    expect(listed('Tender')).toBe(false);
  });
});

scenario('A past meeting alone keeps no project listed', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('the same, with only last month\'s meeting left', () => leadership(['- 2026-09-15 10:00 Sparring #jf/anna']));
  when('I open Projects under Coaching', async () => {
    await openApp({settings: active(coaching)});
    await tapTab('Projects');
  });
  then('Leadership is not listed', () => {
    expect(listed('Leadership')).toBe(false);
    expectShows('Hidden by Coaching: 2 projects ·');
  });
});

scenario('A loop root shows every loop of its kind', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('a loop setup on #read, "#read/novel" in Home, "#read/paper" in Team and a plain todo in Garden', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Next chapter #read/novel #next'], Meetings: []}));
    putFile(areaFile('Team'), dataFile('area', {Scope: [], Tasks: ['- [ ] Skim the paper #read/paper #next'], Meetings: []}));
    putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: ['- [ ] Weed the beds #next'], Meetings: []}));
  });
  when('I open Daily under a context with "All #read loops"', async () => {
    const reading = {...createNoteSetup('1', 'loop'), name: 'Reading', tags: ['read']};
    await openApp({settings: active(named('Reading', [tag('read')]), {noteSetups: [reading], noteSetupsMigrated: true})});
    await tapTab('Daily');
  });
  then('both loops\' todos show, Garden\'s does not', () => {
    expectShows(/^Next chapter/);
    expectShows(/^Skim the paper/);
    expectNotShows(/^Weed the beds/);
  });
  and('the contexts list reads "Show all #read loops everywhere"', () => expectSentence('Show all #read loops everywhere'));
});

function workAndHome(): void {
  smokeClock();
  putFile(areaFile('Work'), dataFile('area', {Scope: [], Tasks: ['- [ ] Update laptop #computer #next', '- [ ] Call the client #next'], Meetings: []}));
  putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Backup photos #computer #next', '- [ ] Laundry #next'], Meetings: []}));
}

scenario('Show a place and a tag: either one shows', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('Show Area Work and #computer, "Only inside" off', workAndHome);
  when('I open Daily', async () => {
    await openApp({settings: active(named('Desk', [area('Work'), tag('computer')]))});
    await tapTab('Daily');
  });
  then('every Work todo and Home\'s #computer todo show, Home\'s other todo does not', () => {
    expectShows(/^Update laptop/);
    expectShows(/^Call the client/);
    expectShows(/^Backup photos/);
    expectNotShows(/^Laundry/);
  });
  and('the sentence reads "Show Work, plus #computer everywhere"', () => expectSentence('Show Work, plus #computer everywhere'));
});

scenario('Only inside the selected areas: the tag in the place', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('the same with "Only inside the selected areas and projects" on', workAndHome);
  when('I open Daily', async () => {
    await openApp({settings: active(named('Desk', [area('Work'), tag('computer')], [], {onlyInPlaces: true}))});
    await tapTab('Daily');
  });
  then('only Work\'s #computer todo shows', () => {
    expectShows(/^Update laptop/);
    expectNotShows(/^Call the client/);
    expectNotShows(/^Backup photos/);
    expectNotShows(/^Laundry/);
  });
  and('the sentence reads "Show #computer in Work"', () => expectSentence('Show #computer in Work'));
});

scenario('Except cuts a tag out of a place', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('Show Home, Except #computer', workAndHome);
  when('I open Areas, then Daily', async () => {
    await openApp({settings: active(named('Home', [area('Home')], [tag('computer')]))});
    await tapTab('Areas');
  });
  then('Home is listed, Work is not', () => {
    expect(listed('Home')).toBe(true);
    expect(listed('Work')).toBe(false);
  });
  when('I open Daily', () => tapTab('Daily'));
  then('Home\'s #computer todo is hidden, its other todo shows', () => {
    expectNotShows(/^Backup photos/);
    expectShows(/^Laundry/);
  });
  and('the sentence reads "Show Home except #computer"', () => expectSentence('Show Home except #computer'));
});

scenario('Except a place: the sentence says "except in"', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('Show #computer, Except Home', workAndHome);
  when('I open Daily', async () => {
    await openApp({settings: active(named('Desk', [tag('computer')], [area('Home')]))});
    await tapTab('Daily');
  });
  then('Work\'s #computer todo shows, Home\'s does not', () => {
    expectShows(/^Update laptop/);
    expectNotShows(/^Backup photos/);
  });
  and('the sentence reads "Show #computer everywhere except in Home"', () => expectSentence('Show #computer everywhere except in Home'));
});

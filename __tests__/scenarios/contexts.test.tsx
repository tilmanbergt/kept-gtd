import {expectNotShows, expectShows, fieldValue, labelled, openApp, readTexts, storedSettings, tap, tapLabel, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {ContextDef, ContextEntry} from '../../src/domain/contexts';
import {createNoteSetup} from '../../src/domain/noteSetups';
import {GtdParaSettings} from '../../src/domain/settings';

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

scenario('A context filters Areas; Review starts in Everything and narrows on request; Reviewed stays global', {feature: 'Contexts', design: 'technical-design-contexts-tags.md'}, () => {
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
  then('the hub says the context is set, and Stalled projects counts every stalled project, with no "+n"', () => {
    expectShows('Context Home is set · ');
    expectShows('Review only in Home');
    expect(textsBetween('Stalled projects')[0]).toBe('2 projects');
  });
  when('I tap "Review only in Home"', () => tap('Review only in Home'));
  then('Stalled projects counts Home\'s project and "+1 in other contexts"', () => {
    expectShows('Reviewing in Home · ');
    expectShows('Review everything');
    expect(textsBetween('Stalled projects')[0]).toBe('1 project · +1 in other contexts');
  });
  when('I open the step', () => tap('Stalled projects'));
  then('it lists Shed and not Tender, and the title ends "· in Home"', () => {
    expect(readTexts().some(t => t.includes('Shed'))).toBe(true);
    expect(readTexts().some(t => t.includes('Tender'))).toBe(false);
    expect(readTexts().some(t => /Stalled projects · in Home$/.test(t))).toBe(true);
  });
  when('I mark it Reviewed, leave Review for Daily and come back to Review\'s overview', async () => {
    await tap('Reviewed ›');
    await tapTab('Daily');
    await tapTab('Review');
    await tap('Overview');
  });
  then('Review shows Everything again: both projects, and today\'s review (the mark is global)', () => {
    expectShows('Review only in Home');
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

scenario('Settings → Contexts: create Café, listed with its sentence, then choose it from the chip', {feature: 'Contexts', design: DESIGN}, () => {
  given('a space with todos tagged #reading and #computer', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Novel #reading #next', '- [ ] Backup #computer #reading #next', '- [ ] Laundry #next'], Meetings: []}, ['dailyFocus: true']));
  });
  when('I create the context "Café" with Show #reading and Except #computer (its Tags list)', async () => {
    await openApp();
    await tapTab('Daily');
    await tapTab('Settings');
    await tap('Contexts');
    await tap('+ New context');
    await type('e.g. Work, Home, Café', 'Café');
    await tap('Show');
    await tap('Tags');
    await tap('#reading');
    await tap('Except');
    await tap('#computer');
  });
  then('the sentence on top reads it, and the side tabs count the entries', () => {
    expectShows('Show #reading everywhere except #computer');
    expectShows('Show 1');
    expectShows('Except 1');
  });
  then('the header counts what it shows', () => expectShows('Shows 1 of 3 next todos'));
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
  when('I create "Home" with Show on the Area Home and tap Save', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Contexts');
    await tap('+ New context');
    await type('e.g. Work, Home, Café', 'Home');
    await tap('Show');
    await tap('Home', 1);
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

scenario('The Tend line opens Review narrowed, filtered by place', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('"Coaching" shows all #jf threads; Area Team has a #jf/anna todo and the quiet threads anna and #retro/demand; Garden has the quiet thread #retro/beds', () => {
    smokeClock();
    putFile(
      areaFile('Team'),
      dataFile('area', {
        Scope: [],
        Tasks: ['- [ ] Send the notes #jf/anna'],
        Meetings: ['- 2026-09-01 10:00 Sparring #jf/anna', '- 2026-09-02 10:00 Retro #retro/demand'],
        Threads: ['- anna: active', '- demand: active'],
      }),
    );
    putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: [], Meetings: ['- 2026-09-03 10:00 Retro #retro/beds'], Threads: ['- beds: active']}));
  });
  when('I tap the Tend line on Week under Coaching', async () => {
    const setup = (id: string, t: string) => ({...createNoteSetup(id, 'thread'), name: t, tags: [t]});
    await openApp({settings: active(named('Coaching', [tag('jf')]), {noteSetups: [setup('1', 'jf'), setup('2', 'retro')], noteSetupsMigrated: true})});
    await tapTab('Week');
    await tap(/^Tend: /);
  });
  then('Tending threads lists both of Team\'s threads, not Garden\'s, and the title ends "· in Coaching"', () => {
    expect(readTexts().some(t => /Tending threads · in Coaching$/.test(t))).toBe(true);
    expect(listed('anna')).toBe(true);
    expect(listed('demand')).toBe(true);
    expect(listed('beds')).toBe(false);
    expect(loggedErrors()).toEqual([]);
  });
});

/** Settings → Contexts → + New context named `name`. */
async function newContextNamed(name: string, settings?: Partial<GtdParaSettings>): Promise<void> {
  await openApp({settings});
  await tapTab('Settings');
  await tap('Contexts');
  await tap('+ New context');
  await type('e.g. Work, Home, Café', name);
  await tap('Show');
}

scenario('A tag not in use yet is added from New tag', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('no todo carries #shopping; one carries #project/piplanning/q1', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Laundry #next', '- [ ] Plan the quarter #project/piplanning/q1 #next'], Meetings: []}));
  });
  when('I type "#Shopping" in New tag on the Tags tab and tap Add', async () => {
    await newContextNamed('Shops');
    await tap('Tags');
    await type('New tag, e.g. errand', '#Shopping');
    await tap('Add');
  });
  then('the #shopping chip is there and the sentence reads "Show #shopping everywhere"', () => {
    expectShows('#shopping');
    expectShows('Show #shopping everywhere');
    expect(fieldValue('New tag, e.g. errand')).toBe('');
  });
  when('I type "two words" and tap Add', async () => {
    await type('New tag, e.g. errand', 'two words');
    await tap('Add');
  });
  then('the status line says it isn\'t a tag, and nothing is added', () => {
    expect(readTexts().some(t => t.startsWith('"two words" isn\'t a tag'))).toBe(true);
    expectShows('Show #shopping everywhere');
  });
  when('I add "project/piplanning" too', async () => {
    await type('New tag, e.g. errand', 'project/piplanning');
    await tap('Add');
  });
  then('it is a plain chip, and the preview counts the #project/piplanning/q1 todo', () => {
    expectShows('#project/piplanning');
    expectShows('Show #shopping or #project/piplanning everywhere');
    expectShows('Shows 1 of 2 next todos');
  });
  when('I save', () => tap('Save'));
  then('the context is listed with its sentence', () => expectShows('1 next · Show #shopping or #project/piplanning everywhere'));
});

scenario('The "Only inside" switch appears only while Show names a place and a tag', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('Work and Home, with #computer todos in both', workAndHome);
  when('I create "Desk" with Show Area Work and Tags #computer', async () => {
    await newContextNamed('Desk');
    await tap('Work');
    await tap('Tags');
    await tap('#computer');
  });
  then('the switch is offered, off, and the sentence reads "Show Work, plus #computer everywhere"', () => {
    expectShows('☐ Only inside the selected areas and projects');
    expectShows('Show Work, plus #computer everywhere');
  });
  when('I tick it', () => tap('☐ Only inside the selected areas and projects'));
  then('the sentence reads "Show #computer in Work"', () => expectShows('Show #computer in Work'));
  when('I look at Except', () => tap('Except'));
  then('the switch is not offered there', () => expectNotShows(/Only inside the selected areas and projects/));
  when('I go back to Show and remove #computer', async () => {
    await tap('Show 2');
    await tap('#computer');
  });
  then('the switch row is gone', () => {
    expectNotShows(/Only inside the selected areas and projects/);
    expectShows('Show Work');
  });
  when('I save', () => tap('Save'));
  then('the stored context does not keep the switch', async () => {
    const stored = (await storedSettings()).contexts?.find(c => c.name === 'Desk');
    expect(stored?.onlyInPlaces).toBeUndefined();
  });
});

scenario('Save is active only after a change; a new context opens on General', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('the areas Home and Team, and the context Home showing Home', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Laundry #next'], Meetings: []}));
    putFile(areaFile('Team'), dataFile('area', {Scope: [], Tasks: ['- [ ] Prepare offer #next'], Meetings: []}));
  });
  when('I open Home in Settings → Contexts', async () => {
    await openApp({settings: {contexts: [named('Home', [area('Home')])]}});
    await tapTab('Settings');
    await tap('Contexts');
    await tap('Home');
  });
  then('it opens on Show, its name is in the header, and Save is inactive', () => {
    expectShows('Show 1');
    expectShows('Areas 1');
    expect(saveDisabled()).toBe(true);
  });
  when('I tap Team', () => tap('Team'));
  then('Save is active and the sentence reads "Show Home and Team"', () => {
    expect(saveDisabled()).toBe(false);
    expectShows('Show Home and Team');
  });
  when('I save', () => tap('Save'));
  then('Save is inactive again and the list shows the new sentence', () => {
    expect(saveDisabled()).toBe(true);
    expectShows('2 next · Show Home and Team');
  });
  when('I start a new context and type "Desk"', async () => {
    await tap('+ New context');
    await type('e.g. Work, Home, Café', 'Desk');
  });
  then('it opens on General, and the header shows the name', () => {
    expectShows('Meetings outside this context');
    expect(readTexts().filter(t => t === 'Desk').length).toBeGreaterThan(0);
  });
});

scenario('The Tags tab offers the thread types of the Thread setups, not wf and owe', {feature: 'Contexts', design: TAGS_DESIGN}, () => {
  given('a Thread setup on #sparring and a todo waiting for Marco', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Quote #wf/marco'], Meetings: []}));
  });
  when('I open the Tags of a new context', async () => {
    const sparring = {...createNoteSetup('1', 'thread'), name: 'Sparring', tags: ['sparring']};
    await newContextNamed('Talks', {noteSetups: [sparring], noteSetupsMigrated: true});
    await tap('Tags');
  });
  then('"All #sparring threads" is offered, "All #wf threads" and "All #owe threads" are not', () => {
    expectShows('All #sparring threads');
    expectNotShows('All #wf threads');
    expectNotShows('All #owe threads');
  });
});

/** Whether the editor's Save is inactive. */
function saveDisabled(): boolean {
  return labelled('Save')?.disabled ?? false;
}

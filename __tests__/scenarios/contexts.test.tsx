import {expectNotShows, expectShows, labelled, openApp, readTexts, tap, tapLabel, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {ContextDef} from '../../src/domain/contexts';

// Contexts (docs/dev/history/technical-design-time-and-place.md §3.3, §6 scenarios 9-12). The clock stands at
// Wednesday 14.10.2026, 10:00.
const DESIGN = 'technical-design-time-and-place.md';

afterEach(() => jest.useRealTimers());

const WORK: ContextDef = {id: 'c1', name: 'Work', shows: [{kind: 'item', itemKind: 'area', name: 'Atruvia'}], hides: [], outsideMeetings: 'dim'};
const HOME: ContextDef = {id: 'c2', name: 'Home', shows: [{kind: 'item', itemKind: 'area', name: 'Garden'}], hides: [], outsideMeetings: 'dim'};
const SETTINGS = {contexts: [WORK, HOME]};

function space(): void {
  smokeClock();
  putFile(
    areaFile('Atruvia'),
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
  putFile(projectFile('Tender'), dataFile('project', {Scope: [], Tasks: ['- [ ] Price list'], Meetings: []}, ['area: Atruvia', 'abbrev: TEN']));
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
  given('contexts Work (Area Atruvia) and Home (Area Garden)', space);
  when('I open Daily, tap the chip in the tab bar, choose Home in Settings → Contexts and go back to Daily', async () => {
    await openApp({settings: SETTINGS});
    await tapTab('Daily');
    await chooseContext('Home');
  });
  then('the chip names Home, and the status line says so', () => {
    expectShows('Home ›');
    expectShows('Context: Home');
  });
  and('Atruvia\'s next todos are hidden, Garden\'s, the Inbox and an overdue Atruvia todo show', () => {
    expectNotShows(/^Prepare offer/);
    expectShows(/^Buy bulbs/);
    expectShows(/^Call the plumber/);
    expectShows(/^Send the report/);
  });
  and('Atruvia\'s meeting is still listed (dimmed), and the hidden line counts the hidden todos', () => {
    expectShows(/^Steering committee/);
    expectShows('Hidden by Home: 2 todos ·');
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
  then('only Garden is listed, and the hidden line counts Atruvia', () => {
    expect(readTexts().some(t => t.includes('Garden'))).toBe(true);
    expect(readTexts().some(t => t.includes('Atruvia'))).toBe(false);
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
  given('Home is active and Atruvia has the abbreviation AT', space);
  when('I add "Prepare offer #AT" on Daily', async () => {
    await openApp({settings: {...SETTINGS, activeContextId: 'c2'}});
    await tapTab('Daily');
    await type('New task', 'Prepare the slides #AT');
    await tap(/^\+ Add to Atruvia/);
  });
  then('it is in Atruvia\'s file, and the status line says "Saved to Atruvia · hidden by Home"', () => {
    expect(sectionLines(areaFile('Atruvia'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Prepare the slides/));
    expect(readTexts().some(t => t.includes('Saved to Atruvia · hidden by Home'))).toBe(true);
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
  then('the preview counts what it shows', () => expectShows('Preview: shows 1 of 3 next todos. The Inbox and todos due today or earlier always show.'));
  when('I save', () => tap('Save'));
  then('Café is listed with its count and summary', () => {
    expectShows('Café');
    expectShows('1 next · Shows #reading · hides #computer');
  });
  when('I tap its radio', () => tapLabel('Use Café'));
  then('the chip names Café', () => {
    expectShows('Café ›');
    expect(labelled('Context')).not.toBeNull();
  });
});

scenario('Settings → Contexts: a context that shows one Area, named and saved from the top row', {feature: 'Contexts', design: DESIGN}, () => {
  given('the areas Home and Atruvia, each with a next todo', () => {
    smokeClock();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: ['- [ ] Laundry #next'], Meetings: []}));
    putFile(areaFile('Atruvia'), dataFile('area', {Scope: [], Tasks: ['- [ ] Prepare offer #next'], Meetings: []}));
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
  then('Daily shows Home\'s todo and hides Atruvia\'s', () => {
    expectShows(/^Laundry/);
    expectNotShows(/^Prepare offer/);
  });
});

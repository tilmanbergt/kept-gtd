import {expectNotShows, expectShows, openApp, readTexts, tap, tapTab, textsBetween, type} from '../../../test-helpers/scenario/app';
import {areaFile, INBOX_FILE, loggedErrors, sectionLines} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenarios 2, 5 and 6 (docs/dev/history/technical-design-test-tiers.md §3.4), against docs/user/daily.md.
// Scenario 5 sets Next with the chip: a #next typed into the text is dropped on + Add.
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

async function openDaily(): Promise<void> {
  smokeClock();
  putSmokeSpace();
  await openApp();
  await tapTab('Daily');
}

/** The todo list under "Next todos": group names and rows (title and labels), without the checkboxes and note buttons. */
const todoList = () => textsBetween('Next todos').filter(t => t !== '☐' && t !== '+📓');

/** The index among the "☐" on screen of the checkbox in front of the row starting with `title`. */
function checkboxOf(title: string): number {
  const all = readTexts();
  const at = all.findIndex(t => t.startsWith(title));
  if (at < 0) throw new Error(`no row "${title}"; the screen shows: ${all.join(' | ')}`);
  return all.slice(0, at).filter(t => t === '☐').length - 1;
}

scenario('Daily shows today\'s meetings, the todos that matter now and the focus', {feature: 'Daily', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => undefined);
  when('I open Daily', openDaily);
  then('the Today tab lists "Neighbour chat" and "Dentist"', () => {
    expect(textsBetween('Today', 'Focus')).toEqual(expect.arrayContaining(['Neighbour chat', 'Dentist']));
    expect(textsBetween('Today', 'Focus')).not.toContain('Supplier call');
  });
  and('the todos are grouped under Inbox, Garage, Garden and Website, each with its label', () => {
    expect(todoList()).toEqual([
      'Inbox', 'Call the plumber  #next',
      'Garage', 'Sort tools  #next',
      'Garden', 'Buy bulbs  #next', 'Water the lawn  #due 14.10.',
      'Website', 'Send invoice  #due 13.10. !', 'Feedback on layout  #w/f Lena',
    ]);
  });
  and('"Sort tools" shows because Garage is in weekly focus; "Draft homepage" doesn\'t, its project is in no focus', () => {
    expectShows(/^Sort tools/);
    expectNotShows(/^Draft homepage/);
  });
  and('Someday, Maybe and done todos don\'t show', () => {
    expectNotShows(/^Repair the fence/);
    expectNotShows(/^Someday idea/);
    expectNotShows(/^Order seeds/);
  });
  and('the focus panel shows Garden under Areas', () => expect(textsBetween('Focus', 'Todo')).toEqual(expect.arrayContaining(['Areas', 'Garden'])));
  when('I tap Tomorrow', () => tap('Tomorrow'));
  then('it lists "Supplier call"', () => {
    expect(textsBetween('Tomorrow', 'Focus')).toContain('Supplier call');
    expectNotShows('Neighbour chat');
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Quick Add a todo from Daily', {feature: 'Quick Add', design: DESIGN}, () => {
  given('the smoke space and Daily open', openDaily);
  when('I type "Check gutters", tap the Next chip and + Add', async () => {
    await type('New task', 'Check gutters');
    await tap('Next');
    await tap('+ Add');
  });
  then('Inbox.txt has it', () => {
    expect(sectionLines(INBOX_FILE, 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Check gutters #next/));
  });
  and('Daily lists it in the Inbox group', () => expect(textsBetween('Inbox', 'Garage')).toContain('Check gutters  #next'));
});

scenario('Tick a todo done on Daily', {feature: 'Daily', design: DESIGN}, () => {
  given('the smoke space and Daily open', openDaily);
  when('I tick "Water the lawn"', () => tap('☐', checkboxOf('Water the lawn')));
  then('Garden\'s area.txt has it done with today\'s completion date', () => {
    expect(sectionLines(areaFile('Garden'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[x\] Water the lawn .*\[completion:: 2026-10-14\]$/));
  });
});

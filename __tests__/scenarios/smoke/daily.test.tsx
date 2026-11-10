import {expectNotShows, expectShows, openApp, readTexts, tap, tapTab, textsBetween, type} from '../../../test-helpers/scenario/app';
import {areaFile, INBOX_FILE, loggedErrors, sectionLines} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock, smokeSettings} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenarios 2, 5 and 6 (docs/dev/history/technical-design-test-tiers.md §3.4; scenario 2 under a context,
// docs/dev/history/technical-design-time-and-place.md §6), against docs/user/daily.md.
// Scenario 5 sets Next with the chip: a #next typed into the text is dropped on + Add.
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

async function openDaily(underHome = false): Promise<void> {
  smokeClock();
  putSmokeSpace();
  await openApp({settings: smokeSettings(underHome)});
  await tapTab('Daily');
}

/** The list under the Next tab: group names and rows (title and grey note), without the checkboxes, the other count tabs and note buttons. */
const todoList = () => textsBetween(/^Inbox \d+$/).filter(t => t !== '☐' && t !== '+📓');

/** The index among the "☐" on screen of the checkbox in front of the row starting with `title`. */
function checkboxOf(title: string): number {
  const all = readTexts();
  const at = all.findIndex(t => t.startsWith(title));
  if (at < 0) throw new Error(`no row "${title}"; the screen shows: ${all.join(' | ')}`);
  return all.slice(0, at).filter(t => t === '☐').length - 1;
}

scenario('Daily under a context shows today\'s meetings and the next todos it shows, and counts the rest', {feature: 'Daily', design: DESIGN, help: 'daily.md#what-appears-on-daily, contexts.md#the-hidden-line'}, () => {
  given('the smoke space on Wednesday 14.10.2026 with the context Home (Area Garden) active', () => undefined);
  when('I open Daily', () => openDaily(true));
  then('the Today tab lists "Neighbour chat" and "Dentist"', () => {
    expect(textsBetween('Today', 'Todo')).toEqual(expect.arrayContaining(['Neighbour chat', 'Dentist']));
    expect(textsBetween('Today', 'Todo')).not.toContain('Supplier call');
  });
  and('the todos under Next are Garden\'s project Garage\'s and Garden\'s (the Inbox\'s are under Inbox), a due one with its grey note; the rest is counted, Website\'s overdue one as "1 due!"', () => {
    expect(todoList()).toEqual([
      'Garage', 'Sort tools',
      'Garden', 'Buy bulbs', 'Water the lawn', 'due today',
      'Hidden by Home: 3 todos · 1 thread · 1 due! · ', 'Show',
    ]);
  });
  and('Someday, Maybe and done todos don\'t show', () => {
    expectNotShows(/^Repair the fence/);
    expectNotShows(/^Someday idea/);
    expectNotShows(/^Order seeds/);
  });
  when('I tap Show', () => tap('Show'));
  then('Website\'s next todo shows too', () => expectShows(/^Draft homepage/));
  when('I tap the Waiting tab', () => tap(/^Waiting \d+$/));
  then('Website\'s Waiting For shows there', () => expectShows(/^Feedback on layout/));
  when('I tap Tomorrow', () => tap('Tomorrow'));
  then('it lists "Supplier call"', () => {
    expect(textsBetween('Tomorrow', 'Todo')).toContain('Supplier call');
    expectNotShows('Neighbour chat');
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Quick Add a todo from Daily', {feature: 'Quick Add', design: DESIGN, help: 'quick-add.md#adding-a-todo'}, () => {
  given('the smoke space and Daily open', openDaily);
  when('I type "Check gutters", tap the Next chip and + Add', async () => {
    await type('New task', 'Check gutters');
    await tap('Next');
    await tap('+ Add');
  });
  then('Inbox.txt has it', () => {
    expect(sectionLines(INBOX_FILE, 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Check gutters #next/));
  });
  when('I open the Inbox tab', () => tap(/^Inbox \d+$/));
  then('it lists it, not Next', () => expect(textsBetween(/^Inbox \d+$/)).toContain('Check gutters'));
});

scenario('Tick a todo done on Daily', {feature: 'Daily', design: DESIGN, help: 'daily.md#schedule-and-cards'}, () => {
  given('the smoke space and Daily open', openDaily);
  when('I tick "Water the lawn"', () => tap('☐', checkboxOf('Water the lawn')));
  then('Garden\'s area.txt has it done with today\'s completion date', () => {
    expect(sectionLines(areaFile('Garden'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[x\] Water the lawn .*\[completion:: 2026-10-14\]$/));
  });
});

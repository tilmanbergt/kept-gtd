import {expectNotShows, expectShows, openApp, readTexts, tap, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../test-helpers/scenario/smokeSpace';

// Daily slim's scenarios T1, T3, T4 and T5 (docs/dev/history/technical-design-daily-slim.md §5): Daily on the
// shared entry actions behaves as before.
const DESIGN = 'technical-design-daily-slim.md';

afterEach(() => jest.useRealTimers());

async function openDaily(): Promise<void> {
  smokeClock();
  putSmokeSpace();
  await openApp();
  await tapTab('Daily');
}

/** The index among the "☐" on screen of the checkbox in front of the row starting with `title`. */
function checkboxOf(title: string): number {
  const all = readTexts();
  const at = all.findIndex(t => t.startsWith(title));
  if (at < 0) throw new Error(`no row "${title}"; the screen shows: ${all.join(' | ')}`);
  return all.slice(0, at).filter(t => t === '☐').length - 1;
}

scenario('Daily: a todo\'s card, then its edit, saved into its own file', {feature: 'Daily', design: DESIGN}, () => {
  given('the smoke space and Daily open', openDaily);
  when('I tap "Water the lawn"', () => tap(/^Water the lawn/));
  then('its card shows in Quick Add\'s place, with its owner', () => {
    expectShows('Garden');
    expectNotShows('+ Add');
  });
  when('I tap Edit on the card, change the text to "Water the lawn early" and save', async () => {
    await tap('Edit');
    await type('New task', 'Water the lawn early');
    await tap('Save');
  });
  then('Garden\'s area.txt has the new text and the card shows again', () => {
    expect(sectionLines(areaFile('Garden'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Water the lawn early \[due:: 2026-10-14\]$/));
    expectNotShows('+ Add');
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('Focus session with two Inbox todos: both done, #now cleared from both', {feature: 'Daily', design: DESIGN}, () => {
  given('the Inbox has "Call the plumber" and "Pay the invoice", both #now', () => {
    smokeClock();
    putSmokeSpace();
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: ['- [ ] Call the plumber #next #now', '- [ ] Pay the invoice #next #now'], Meetings: []}));
  });
  when('I open focus mode from Daily', async () => {
    await openApp();
    await tapTab('Daily');
    await tap('Focus mode');
  });
  then('the running session lists both', () => {
    expectShows(/^Call the plumber/);
    expectShows(/^Pay the invoice/);
    expectNotShows('Start focus session');
  });
  when('I tick both', async () => {
    await tap('☐', checkboxOf('Call the plumber'));
    await tap('☐', checkboxOf('Pay the invoice'));
  });
  then('"Congratulations: All tasks done!" lists both', () => {
    expect(textsBetween('Congratulations: All tasks done!', 'Create new session')).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Call the plumber/), expect.stringMatching(/^Pay the invoice/)]),
    );
  });
  and('Inbox.txt has both done, neither with #now', () => {
    const lines = sectionLines(INBOX_FILE, 'Tasks');
    expect(lines).toEqual([expect.stringMatching(/^- \[x\] Call the plumber #next \[completion:: 2026-10-14\]$/), expect.stringMatching(/^- \[x\] Pay the invoice #next \[completion:: 2026-10-14\]$/)]);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('Daily\'s tag filter: tapping a tag shows only its todos, the pill clears it', {feature: 'Daily', design: DESIGN}, () => {
  given('the smoke space with "Buy bulbs #garden" in Garden', () => {
    smokeClock();
    putSmokeSpace();
    putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: ['- [ ] Buy bulbs #next #garden', '- [ ] Rake leaves #garden', '- [ ] Water the lawn [due:: 2026-10-14]'], Meetings: []}, ['dailyFocus: true', 'abbrev: GA']));
  });
  when('I open Daily and tap #garden in a row', async () => {
    await openApp();
    await tapTab('Daily');
    await tap('#garden');
  });
  then('only #garden todos show and the pill reads #garden', () => {
    expectShows('#garden');
    expectShows(/^Rake leaves/);
    expectNotShows(/^Water the lawn/);
    expectNotShows(/^Call the plumber/);
  });
  when('I tap the pill', () => tap('#garden', 0));
  then('everything shows again', () => {
    expectShows(/^Water the lawn/);
    expectShows(/^Call the plumber/);
  });
});

scenario('Quick-file from a Daily edit: "Save to <Name>" moves the todo', {feature: 'Daily', design: DESIGN}, () => {
  given('"Buy bulbs" in the Inbox and project Garage (#GAR)', () => {
    smokeClock();
    putSmokeSpace();
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: ['- [ ] Buy bulbs #next'], Meetings: []}));
  });
  when('I edit it on Daily, add "#GAR" and tap Save to Garage', async () => {
    await openApp();
    await tapTab('Daily');
    await tap(/^Buy bulbs/);
    await tap('Edit');
    await type('New task', 'Buy bulbs #GAR');
    await tap(/^Save to Garage/);
  });
  then('it is in Garage\'s file and not in Inbox.txt', () => {
    expect(sectionLines(projectFile('Garage'), 'Tasks')).toContainEqual(expect.stringMatching(/^- \[ \] Buy bulbs #next/));
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual([]);
    expect(loggedErrors()).toEqual([]);
  });
});

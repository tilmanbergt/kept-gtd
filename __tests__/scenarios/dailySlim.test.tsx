import {expectNotShows, expectShows, openApp, tap, tapTab, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../test-helpers/scenario/smokeSpace';

// Daily slim's scenarios T1, T4 and T5 (docs/dev/history/technical-design-daily-slim.md §5; T3 tested the retired
// focus mode): Daily on the
// shared entry actions behaves as before.
const DESIGN = 'technical-design-daily-slim.md';

afterEach(() => jest.useRealTimers());

async function openDaily(): Promise<void> {
  smokeClock();
  putSmokeSpace();
  await openApp();
  await tapTab('Daily');
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

scenario('Daily has no tag filter: its todos all show, with no "#" row above the columns', {feature: 'Daily', design: 'technical-design-launch-ready.md'}, () => {
  given('the smoke space with "Buy bulbs #garden" in Garden', () => {
    smokeClock();
    putSmokeSpace();
    putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: ['- [ ] Buy bulbs #next #garden', '- [ ] Rake leaves #garden', '- [ ] Water the lawn [due:: 2026-10-14]'], Meetings: []}, ['dailyFocus: true', 'abbrev: GA']));
  });
  when('I open Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  then('the todos the Daily rule lets through show, and there is no filter pill', () => {
    expectShows(/^Buy bulbs/);
    expectShows(/^Water the lawn/);
    expectNotShows(/^Rake leaves/);
    expectNotShows('#');
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

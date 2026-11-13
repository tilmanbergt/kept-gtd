// docs/dev/history/technical-design-quickadd-redesign.md §6 scenario 19 (F1): a todo card on Daily
// links a file through the picker that takes the list's place.
import {expectShows, labelled, openApp, tap, tapLabel, tapTab} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, PATHS, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());

scenario('A todo card on Daily links a file through the picker in the list\'s place', {feature: 'Daily', design: 'technical-design-quickadd-redesign.md', help: 'daily.md#linking-a-file-from-daily'}, () => {
  given('on 11.11. the #next todo "Order soil" in Garden renovation and plan.pdf in Resources', () => {
    fixedClock(new Date(2026, 10, 11, 10, 0));
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next'], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
    putFile(`${PATHS.resources}/plan.pdf`, '%PDF');
  });
  when('I open Daily, tap the todo and the clip on its card', async () => {
    await openApp();
    await tapTab('Daily');
    await tap(/^Order soil/);
    await tapLabel('Link file');
  });
  then('the picker replaces the list, with its way back', () => {
    expectShows('‹ Back to the card');
    expectShows('Resources');
  });
  when('I open Resources and tap plan.pdf', async () => {
    await tap('Resources');
    await tap(/plan\.pdf/);
  });
  then('the todo links it and its card\'s clip is filled', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')[0]).toMatch(/^- \[ \] Order soil #next \+\[\[3 Resources\/plan\.pdf\]\]/);
    expect(labelled('Open linked file')?.on).toBe(true);
  });
});

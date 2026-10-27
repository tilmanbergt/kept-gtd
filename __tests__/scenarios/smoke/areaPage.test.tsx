import {device} from '../../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, tap, tapTab, texts, textsBetween} from '../../../test-helpers/scenario/app';
import {areaDir, loggedErrors} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenario 7 (docs/dev/history/technical-design-test-tiers.md §3.4), against docs/user/projects-and-areas.md.
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

/** How often the Files pane listed `folder` (it logs each listing). */
const listings = (folder: string) => device().logs.filter(l => l.text === `FileBrowserPane: loading ${folder} `).length;

scenario('The area page shows its todos, meetings and agreements, and its folder once Files is opened', {feature: 'Projects and Areas', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => {
    smokeClock();
    putSmokeSpace();
  });
  when('I open Garden from Areas', async () => {
    await openApp();
    await tapTab('Areas');
    await tap(/^★ Garden/);
  });
  then('Todos list "Buy bulbs" and "Repair the fence", and Meetings list "Neighbour chat"', () => {
    const todos = textsBetween('Todos', '◇ Agreements 1 ›');
    expect(todos).toEqual(expect.arrayContaining(['Buy bulbs', 'Repair the fence']));
    expect(textsBetween('◇ Agreements 1 ›')).toContain('Neighbour chat');
  });
  and('Garden\'s folder is not listed', () => {
    expect(listings(areaDir('Garden'))).toBe(0);
    expectNotShows('📄 area.txt');
  });
  when('I tap "◇ Agreements 1 ›"', () => tap('◇ Agreements 1 ›'));
  then('the list shows "Water only in the morning"', () => expectShows('◇ Water only in the morning'));
  // "Files" shows twice on this page; the Files tab is the last one.
  when('I tap Files', () => tap('Files', texts().filter(t => t === 'Files').length - 1));
  then('the folder is listed once and its entries show', () => {
    expect(listings(areaDir('Garden'))).toBe(1);
    expectShows('📄 area.txt');
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

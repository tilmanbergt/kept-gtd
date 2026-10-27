import {expectShows, openApp, shows, tap, tapTab} from '../../../test-helpers/scenario/app';
import {loggedErrors} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenario 1 (docs/dev/history/technical-design-test-tiers.md §3.4).
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

/** Each main tab and the text that tells it is there. */
const TABS: Array<[string, string | RegExp]> = [
  ['Daily', 'Next todos'],
  ['Week', /^Week 42 · 2026/],
  ['Month', /^October 2026/],
  ['Projects', '+ Create Project'],
  ['Areas', '+ Create Area'],
  ['Review', 'No complete review yet.'],
  ['Settings', 'Base root'],
];

scenario('The app starts and every main tab shows', {feature: 'Smoke', design: DESIGN}, () => {
  const missing: string[] = [];
  given('the smoke space on Wednesday 14.10.2026', () => {
    smokeClock();
    putSmokeSpace();
  });
  when('I open the app and tap through Daily, Week, Month, Projects, Areas, Review, Settings and the help', async () => {
    await openApp();
    for (const [tab, heading] of TABS) {
      await tapTab(tab);
      if (!shows(heading)) missing.push(`${tab}: ${String(heading)}`);
    }
    await tap('?');
  });
  then('each shows its main heading', () => {
    expect(missing).toEqual([]);
    expectShows('Help');
    expectShows('✕ Close');
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

import {act} from '@testing-library/react-native';
import {setScreenSimulation} from '../../../src/ui/screenSimStore';
import {describeScreen, expectShows, openApp, readTexts, settle, shows, tap, tapTab} from '../../../test-helpers/scenario/app';
import {loggedErrors} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenario 8 (docs/dev/history/technical-design-test-tiers.md §3.4), against docs/user/review.md;
// every step renders, also at Nomad size (docs/dev/history/technical-design-launch-ready.md §7 L7).
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

/** The count the hub shows under `step`. */
function stepCount(step: string): string {
  const all = readTexts();
  const at = all.indexOf(step);
  if (at < 0) throw new Error(`no step "${step}"; the screen shows: ${describeScreen()}`);
  return all[at + 1];
}

scenario('The Review hub lists its steps with counts, and the Inbox step shows the Inbox', {feature: 'Weekly Review', design: DESIGN, help: 'review.md#the-overview'}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => {
    smokeClock();
    putSmokeSpace();
  });
  when('I open Review', async () => {
    await openApp();
    await tapTab('Review');
  });
  then('the hub lists its steps with counts: the week\'s schedule (focus block included), the Inbox\'s open todo and its meeting (its Maybe todo waits in Someday / Maybe); no focus steps', () => {
    expect(stepCount('Week ahead')).toBe('5 meetings');
    expect(stepCount('Inbox to zero')).toBe('2 items');
    expect(readTexts()).not.toContain('Unfocused next items');
    expect(readTexts()).not.toContain('Focus reset');
  });
  when('I open the step "Inbox to zero"', () => tap('Inbox to zero'));
  then('it shows "Call the plumber"', () => expectShows(/^Call the plumber/));
  and('every step opens with its title, one after the other, up to the end page', () => walkAllSteps());
  when('Kept is drawn at Nomad portrait size and I open Review again', async () => {
    await act(async () => setScreenSimulation('nomad-portrait'));
    await settle();
    await tapTab('Review');
  });
  then('every step opens there too', () => walkAllSteps());
  and('no error was logged', async () => {
    await act(async () => setScreenSimulation(null));
    expect(loggedErrors()).toEqual([]);
  });
});

/** From the hub (or a step), opens the first step and skips through all of them to the end page. */
async function walkAllSteps(): Promise<void> {
  if (shows('Overview')) await tap('Overview');
  await tap('Week ahead');
  const titles: string[] = [];
  while (!shows('That was the last step.')) {
    const title = readTexts().find(t => /^Step \d+ of \d+ — /.test(t));
    if (!title) throw new Error(`no step title; the screen shows: ${describeScreen()}`);
    if (titles.includes(title)) throw new Error(`step "${title}" came twice`);
    titles.push(title);
    await tap('Skip ›');
  }
  const total = Number(/of (\d+)/.exec(titles[0])?.[1]);
  expect(titles).toHaveLength(total);
  expect(total).toBeGreaterThanOrEqual(10);
  expect(titles[0]).toMatch(/— Week ahead$/);
}

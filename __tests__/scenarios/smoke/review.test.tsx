import {describeScreen, expectShows, openApp, readTexts, tap, tapTab} from '../../../test-helpers/scenario/app';
import {loggedErrors} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenario 8 (docs/dev/history/technical-design-test-tiers.md §3.4), against docs/user/review.md.
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

/** The count the hub shows under `step`. */
function stepCount(step: string): string {
  const all = readTexts();
  const at = all.indexOf(step);
  if (at < 0) throw new Error(`no step "${step}"; the screen shows: ${describeScreen()}`);
  return all[at + 1];
}

scenario('The Review hub lists its steps with counts, and the Inbox step shows the Inbox', {feature: 'Weekly Review', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => {
    smokeClock();
    putSmokeSpace();
  });
  when('I open Review', async () => {
    await openApp();
    await tapTab('Review');
  });
  then('the hub lists its steps with counts: the Inbox\'s two todos and its meeting, the one Next todo outside focus', () => {
    expect(stepCount('Inbox to zero')).toBe('3 items');
    expect(stepCount('Unfocused next items')).toBe('1 task');
  });
  when('I open the step "Inbox to zero"', () => tap('Inbox to zero'));
  then('it shows "Call the plumber"', () => expectShows(/^Call the plumber/));
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

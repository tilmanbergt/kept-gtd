import {expectNotShows, expectShows, openApp, tap, tapTab} from '../../../test-helpers/scenario/app';
import {loggedErrors} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenario 9 (docs/dev/history/technical-design-test-tiers.md §3.4), against docs/user/profiles-and-demo.md.
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

scenario('Switch to the demo space and back', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => {
    smokeClock();
    putSmokeSpace();
  });
  when('I create the demo space in Settings → Advanced and switch to it', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Advanced');
    await tap('Create demo space');
    await tap('Switch');
    await tap('Switch');
  });
  then('Daily shows the demo\'s content', async () => {
    await tapTab('Daily');
    expectShows('DEMO');
    expectShows(/^Book the dentist appointment/);
    expectNotShows(/^Buy bulbs/);
  });
  when('I switch back to Production', async () => {
    await tap('DEMO');
    await tap('Switch');
    await tap('Switch');
    await tapTab('Daily');
  });
  then('Daily shows the smoke space again', () => {
    expectNotShows('DEMO');
    expectShows(/^Buy bulbs/);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

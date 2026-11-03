import {A5X_ESTIMATOR_WIDTH} from '../../src/domain/screenLayout';
import {estimatorWidth} from '../../src/ui/ScreenSize';
import {expectNotShows, expectShows, openApp, tap, tapTab} from '../../test-helpers/scenario/app';
import {and, scenario, then, when} from '../../test-helpers/scenario/scenario';

const LINE = 'Simulated Nomad portrait · Settings → Advanced → Simulate screen: Off';

scenario('Simulate screen draws Kept at Nomad size until it is turned off', {feature: 'Settings', design: 'technical-design-launch-ready.md'}, () => {
  when('I turn on debug logging and choose Settings → Advanced → Simulate screen: Nomad portrait', async () => {
    await openApp({settings: {debugLogging: true}});
    await tapTab('Settings');
    await tap('Advanced');
    expectShows('Simulate screen');
    await tap('Nomad portrait');
  });
  then('Kept says it is simulating, and estimates rows for the narrower columns', () => {
    expectShows(LINE);
    expect(estimatorWidth()).toBeLessThan(A5X_ESTIMATOR_WIDTH);
  });
  and('Off in the same place ends it', async () => {
    await tapTab('Settings');
    await tap('Advanced');
    await tap('Off');
    expectNotShows(LINE);
    expect(estimatorWidth()).toBe(A5X_ESTIMATOR_WIDTH);
  });
});

scenario('Simulate screen is hidden while debug logging is off', {feature: 'Settings', design: 'technical-design-launch-ready.md'}, () => {
  when('I open Settings → Advanced with debug logging off', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Advanced');
  });
  then('there is no Simulate screen', () => expectNotShows('Simulate screen'));
});

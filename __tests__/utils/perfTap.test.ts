// The `tap` trace (docs/dev/history/technical-design-calmer-screens.md §3.1): a row's tap starts it,
// the card's first commit is the measured end.
import {perfBegin, perfCardCommit, perfEnable} from '../../src/utils/perf';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  perfEnable(false);
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('perfCardCommit', () => {
  it('returns nothing while no trace runs', () => {
    perfEnable(true);
    perfEnable(false);
    expect(perfCardCommit({kind: 'todo'})).toBeNull();
  });
  it('returns the time and the screen for the first card commit of a tap trace only', () => {
    perfEnable(true);
    perfBegin('tap', 'card', {screen: 'DailyView'});
    const first = perfCardCommit({kind: 'todo'});
    expect(first).not.toBeNull();
    expect(first!.ms).toBeGreaterThanOrEqual(0);
    expect(first!.meta).toEqual({screen: 'DailyView'});
    expect(perfCardCommit({kind: 'todo'})).toBeNull();
  });
  it('does not report a card commit inside another kind of trace', () => {
    perfEnable(true);
    perfBegin('tab', 'daily');
    expect(perfCardCommit({kind: 'todo'})).toBeNull();
  });
});

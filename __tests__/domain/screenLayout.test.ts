import {A5X_ESTIMATOR_WIDTH, A5X_PORTRAIT, estimatorWidthFor, layoutWidthClass, realColumnWidth, simulationsThatFit, weekGridRows, isShortScreen, monthNeedsHalves, monthHalfOf} from '../../src/domain/screenLayout';

describe('estimatorWidthFor', () => {
  it('is exactly the A5 X figure on the A5 X, so nothing pages differently there', () => {
    expect(estimatorWidthFor(A5X_PORTRAIT)).toBe(678);
    expect(estimatorWidthFor({width: 990, height: 1320})).toBe(678);
    expect(A5X_ESTIMATOR_WIDTH).toBe(678);
  });
  it('stays at the A5 X figure on wider screens: estimates can only err long', () => {
    expect(estimatorWidthFor({width: 1024, height: 1365})).toBe(678); // Manta portrait
    expect(estimatorWidthFor({width: 1325, height: 994})).toBe(678); // A5 X landscape
  });
  it('scales down with the column width on a narrower screen', () => {
    // Nomad portrait: columns (750-48)/2 = 351 vs. the A5 X's 473
    expect(realColumnWidth({width: 750, height: 1000})).toBe(351);
    expect(estimatorWidthFor({width: 750, height: 1000})).toBe(Math.round((678 * 351) / 473));
    expect(estimatorWidthFor({width: 750, height: 1000})).toBeLessThan(678);
  });
  it('never drops below 1', () => {
    expect(estimatorWidthFor({width: 10, height: 10})).toBe(1);
  });
});

describe('layoutWidthClass', () => {
  it('narrow below 800 dp', () => {
    expect(layoutWidthClass({width: 750, height: 1000})).toBe('narrow');
    expect(layoutWidthClass({width: 800, height: 1000})).toBe('wide');
    expect(layoutWidthClass(A5X_PORTRAIT)).toBe('wide');
  });
});

describe('simulationsThatFit', () => {
  it('Nomad portrait fits an upright A5 X, Nomad landscape a turned one', () => {
    expect(simulationsThatFit({width: 994, height: 1325})).toEqual(['nomad-portrait']);
    expect(simulationsThatFit({width: 1325, height: 994})).toEqual(['nomad-landscape']);
    expect(simulationsThatFit({width: 700, height: 700})).toEqual([]);
  });
});

describe('weekGridRows', () => {
  const rows = (height: number | null) => weekGridRows(height, 34, 36);
  it('keeps 4 weekday and 2 weekend rows where they fit (the A5 X Week column, ~1113 dp)', () => {
    expect(rows(1113)).toEqual({weekday: 4, weekend: 2});
    expect(rows(7 * 36 + 24 * 34)).toEqual({weekday: 4, weekend: 2});
  });
  it('keeps them before the first measurement', () => {
    expect(rows(null)).toEqual({weekday: 4, weekend: 2});
  });
  it('takes fewer rows on a shorter column, the weekend first', () => {
    expect(rows(7 * 36 + 24 * 34 - 1)).toEqual({weekday: 4, weekend: 1});
    expect(rows(860)).toEqual({weekday: 3, weekend: 1}); // a Nomad upright
    expect(rows(7 * 36 + 13 * 34)).toEqual({weekday: 2, weekend: 1}); // a turned A5 X
  });
  it('never goes below one row a day', () => {
    expect(rows(100)).toEqual({weekday: 1, weekend: 1});
  });
});

describe('isShortScreen', () => {
  it('a Nomad and any turned device are short, the A5 X and Manta upright are not', () => {
    expect(isShortScreen({width: 749, height: 998})).toBe(true);
    expect(isShortScreen({width: 1325, height: 994})).toBe(true);
    expect(isShortScreen(A5X_PORTRAIT)).toBe(false);
    expect(isShortScreen({width: 1024, height: 1365})).toBe(false);
  });
});

describe('Month halves', () => {
  it('only when 31 rows would be lower than 24 dp - the same for every month', () => {
    expect(monthNeedsHalves(31 * 24)).toBe(false);
    expect(monthNeedsHalves(31 * 24 - 1)).toBe(true);
    expect(monthNeedsHalves(820)).toBe(false); // A5 X turned
    expect(monthNeedsHalves(630)).toBe(true); // Nomad turned
    expect(monthNeedsHalves(null)).toBe(false);
  });
  it('days 1-15 are the first half', () => {
    expect(monthHalfOf('2026-10-15')).toBe(0);
    expect(monthHalfOf('2026-10-16')).toBe(1);
  });
});

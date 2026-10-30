import {A5X_ESTIMATOR_WIDTH, A5X_PORTRAIT, estimatorWidthFor, layoutWidthClass, realColumnWidth} from '../../src/domain/screenLayout';

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

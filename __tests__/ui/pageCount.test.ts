// docs/dev/history/technical-design-quickadd-redesign.md §3.8 F6: page count for the nav row, same
// greedy fill as usePagedByHeight, and no oscillation when the nav row takes its height.
import {pageCount} from '../../src/ui/pagination';
import {PAGE_NAV_ROW_HEIGHT} from '../../src/ui/PageNavRow';

const h = (n: number) => n;

describe('pageCount', () => {
  it('counts one page for an empty or fitting list', () => {
    expect(pageCount([], h, 100)).toBe(1);
    expect(pageCount([30, 30, 40], h, 100)).toBe(1);
  });

  it('starts a new page when the next row does not fit', () => {
    expect(pageCount([30, 30, 50], h, 100)).toBe(2);
    expect(pageCount([60, 60, 60, 60], h, 100)).toBe(4);
  });

  it('admits an oversize row on its own page', () => {
    expect(pageCount([300, 10], h, 100)).toBe(2);
  });

  it('never drops back to one page once the nav row is reserved', () => {
    for (let total = 1; total < 40; total++) {
      const rows = Array.from({length: total}, () => 34);
      const full = 400;
      if (pageCount(rows, h, full) > 1) expect(pageCount(rows, h, full - PAGE_NAV_ROW_HEIGHT)).toBeGreaterThan(1);
    }
  });
});

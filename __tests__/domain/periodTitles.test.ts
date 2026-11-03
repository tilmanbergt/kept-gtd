import {shortMonthTitle, shortWeekTitle} from '../../src/domain/period';

describe('short period titles for the Week and Month tab rows', () => {
  it('a month as its three letters and the two-digit year', () => {
    expect(shortMonthTitle(new Date(2026, 9, 14))).toBe('Oct 26');
    expect(shortMonthTitle(new Date(2027, 0, 1))).toBe('Jan 27');
  });
  it('a week with its number and the two-digit year it belongs to', () => {
    expect(shortWeekTitle(44, 2026)).toBe('Week 44 · 26');
  });
});

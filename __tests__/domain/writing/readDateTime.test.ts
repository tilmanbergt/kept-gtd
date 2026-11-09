// docs/dev/history/technical-design-writing-help.md §1.6: every example of "Dates" and "Times".
import {foldDigits, readDate, readTime} from '../../../src/domain/writing/readDateTime';

const TODAY = '2026-11-09';

describe('foldDigits', () => {
  it('folds the look-alike letters of date and time fields', () => {
    expect(foldDigits('OoIli|SsZzBgqb')).toBe('00111155228996');
  });

  it('keeps digits, separators and other letters', () => {
    expect(foldDigits('15,30-16 d')).toBe('15,30-16 d');
  });
});

describe('readTime', () => {
  it.each([
    ['15,30', '15:30'],
    ['15 30', '15:30'],
    ['1530', '15:30'],
    ['930', '09:30'],
    ['15h', '15:00'],
    ['l5,3O-l6', '15:30-16:00'],
    ['15;30', '15:30'],
    ["15'30", '15:30'],
    ['15 – 16', '15:00-16:00'],
    ['15 bis 16', '15:00-16:00'],
    ['1O.3O', '10:30'],
  ])('reads %s as %s', (written, value) => {
    expect(readTime(written)).toEqual({kind: 'read', value});
  });

  it('offers the afternoon first for hours 1-6 without minutes (scenario 14)', () => {
    expect(readTime('3-4')).toEqual({kind: 'choice', values: ['15:00-16:00', '03:00-04:00']});
    expect(readTime('3')).toEqual({kind: 'choice', values: ['15:00', '03:00']});
    expect(readTime('6')).toEqual({kind: 'choice', values: ['18:00', '06:00']});
  });

  it('takes 7 and later as written (scenario 14)', () => {
    expect(readTime('8')).toEqual({kind: 'ok', value: '08:00'});
    expect(readTime('7')).toEqual({kind: 'ok', value: '07:00'});
  });

  it('offers 15:30 and 15:03 for a one-digit minute (scenario 15)', () => {
    expect(readTime('15,3')).toEqual({kind: 'choice', values: ['15:30', '15:03']});
  });

  it('drops a reading the parser rejects', () => {
    // 15-04 ends before it starts: only the afternoon end is valid.
    expect(readTime('15-4')).toEqual({kind: 'read', value: '15:00-16:00'});
  });

  it('leaves valid values and days alone', () => {
    expect(readTime('15:30')).toEqual({kind: 'ok', value: '15:30'});
    expect(readTime('15-16.30')).toEqual({kind: 'ok', value: '15:00-16:30'});
    expect(readTime('2d')).toEqual({kind: 'ok', value: '2d'});
    expect(readTime('')).toEqual({kind: 'ok', value: '1d'});
  });

  it('finds no reading in text that is no time', () => {
    expect(readTime('soon')).toEqual({kind: 'none'});
    expect(readTime('25')).toEqual({kind: 'none'});
    expect(readTime('16-15')).toEqual({kind: 'none'});
    expect(readTime('99d')).toEqual({kind: 'none'});
  });
});

describe('readDate', () => {
  it.each([
    ['9.11.2026', '2026-11-09'],
    ['09.11.26', '2026-11-09'],
    ['9.11.', '2026-11-09'],
    ['9.11', '2026-11-09'],
    ['2026 11 09', '2026-11-09'],
    ['2026.11.09', '2026-11-09'],
    ['20261109', '2026-11-09'],
    ['9.ll.26', '2026-11-09'],
    ['l0,11,2O26', '2026-11-10'],
    ['9/11/26', '2026-11-09'],
  ])('reads %s as %s', (written, value) => {
    expect(readDate(written, TODAY)).toEqual({kind: 'read', value});
  });

  it('takes the next such day for a date without a year', () => {
    expect(readDate('8.11', TODAY)).toEqual({kind: 'read', value: '2027-11-08'});
    expect(readDate('1.1.', TODAY)).toEqual({kind: 'read', value: '2027-01-01'});
  });

  it('reads the only valid order of day and month', () => {
    expect(readDate('11.13', TODAY)).toEqual({kind: 'read', value: '2026-11-13'});
    expect(readDate('11.13.2026', TODAY)).toEqual({kind: 'read', value: '2026-11-13'});
  });

  it('leaves a valid date and an empty field alone', () => {
    expect(readDate('2026-11-10', TODAY)).toEqual({kind: 'ok', value: '2026-11-10'});
    expect(readDate('', TODAY)).toEqual({kind: 'ok', value: ''});
  });

  it('finds no reading in an impossible or half-written date', () => {
    expect(readDate('31.2.2026', TODAY)).toEqual({kind: 'none'});
    expect(readDate('2026-11-', TODAY)).toEqual({kind: 'none'});
    expect(readDate('tomorrow', TODAY)).toEqual({kind: 'none'});
  });
});

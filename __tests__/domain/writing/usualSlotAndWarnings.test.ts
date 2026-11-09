// docs/dev/history/technical-design-writing-help.md §1.6 "Usual time", "Warnings"; §3.6.
import {formatFullDate, formatLength, formatTimeSpan} from '../../../src/domain/dateFormat';
import {deriveMeetingFields} from '../../../src/domain/markdown';
import {Meeting} from '../../../src/domain/types';
import {isPastNew, overlapOf, usualSlot} from '../../../src/domain/writing/meetingHints';
import {meeting} from '../../../test-helpers/fixtures';

function m(date: string, time: string, endTime = '', extra: Partial<Meeting> = {}): Meeting {
  return meeting(date, 'Sparring #101/lena', {...deriveMeetingFields('Sparring #101/lena'), time, endTime, ...extra});
}

// Monday 9 November 2026, 10:00.
const NOW = new Date(2026, 10, 9, 10, 0);

describe('usualSlot', () => {
  it('takes the weekday and start most of the last five share, with the median length (scenario 18)', () => {
    const slot = usualSlot(
      [
        m('2026-10-13', '14:00', '14:45'),
        m('2026-10-20', '14:00', '14:30'),
        m('2026-10-27', '14:00', '15:00'),
        m('2026-10-29', '09:00', '10:00'),
        m('2026-11-02', '16:00', '17:00'),
      ],
      NOW,
    );
    expect(slot).toEqual({date: '2026-11-10', time: '14:00', endTime: '14:45', minutes: 45});
  });

  it('takes the latest meeting when no slot repeats', () => {
    expect(usualSlot([m('2026-10-28', '09:00', '09:30'), m('2026-11-04', '11:00')], NOW)).toEqual({
      date: '2026-11-11',
      time: '11:00',
      endTime: '12:00',
      minutes: 60,
    });
  });

  it('looks only at the last five timed, not cancelled meetings', () => {
    const old = ['2026-09-01', '2026-09-08', '2026-09-15'].map(d => m(d, '08:00'));
    const recent = ['2026-10-06', '2026-10-13'].map(d => m(d, '14:00')).concat(['2026-10-15', '2026-10-22', '2026-10-29'].map(d => m(d, '10:00')));
    expect(usualSlot([...old, ...recent, m('2026-11-03', '07:00', '', {cancelled: true}), m('2026-11-05', '')], NOW)?.time).toBe('10:00');
  });

  it('is today only while the start is still ahead', () => {
    const mondays = [m('2026-10-26', '11:00'), m('2026-11-02', '11:00')];
    expect(usualSlot(mondays, NOW)?.date).toBe('2026-11-09');
    const early = [m('2026-10-26', '08:00'), m('2026-11-02', '08:00')];
    expect(usualSlot(early, NOW)?.date).toBe('2026-11-16');
  });

  it('is null without a timed meeting', () => {
    expect(usualSlot([m('2026-11-02', '')], NOW)).toBeNull();
    expect(usualSlot([], NOW)).toBeNull();
  });
});

describe('overlapOf', () => {
  const day = [
    {...m('2026-11-10', '15:00', '16:00'), title: 'Jour Fixe'},
    {...m('2026-11-10', '09:00'), title: 'Early'},
    {...m('2026-11-10', '15:15', '15:45', {cancelled: true}), title: 'Off'},
    {...m('2026-11-11', '15:30', '16:30'), title: 'Next day'},
  ];

  it('names the first meeting that day whose time intersects (scenario 16)', () => {
    expect(overlapOf({date: '2026-11-10', time: '15:30', endTime: '16:30'}, day)?.title).toBe('Jour Fixe');
    expect(overlapOf({date: '2026-11-10', time: '09:30', endTime: ''}, day)?.title).toBe('Early');
  });

  it('is null for meetings that only touch, a date-only slot or another day', () => {
    expect(overlapOf({date: '2026-11-10', time: '16:00', endTime: '17:00'}, day)).toBeNull();
    expect(overlapOf({date: '2026-11-10', time: '', endTime: ''}, day)).toBeNull();
    expect(overlapOf({date: '2026-11-12', time: '15:30', endTime: ''}, day)).toBeNull();
  });
});

describe('isPastNew', () => {
  it('is true before today and before now today (scenario 17)', () => {
    expect(isPastNew('2026-11-08', '', NOW)).toBe(true);
    expect(isPastNew('2026-11-09', '09:00', NOW)).toBe(true);
  });

  it('is false later today, on a later day and for a date-only meeting today', () => {
    expect(isPastNew('2026-11-09', '11:00', NOW)).toBe(false);
    expect(isPastNew('2026-11-10', '08:00', NOW)).toBe(false);
    expect(isPastNew('2026-11-09', '', NOW)).toBe(false);
  });
});

describe('labels (domain/dateFormat.ts)', () => {
  it('writes the full date with weekday, with and without the year', () => {
    expect(formatFullDate('2026-11-09')).toBe('Mon 9 Nov 2026');
    expect(formatFullDate('2026-11-10')).toBe('Tue 10 Nov 2026');
    expect(formatFullDate('2026-11-17', false)).toBe('Tue 17 Nov');
    expect(formatFullDate('soon')).toBe('soon');
  });

  it('writes lengths and time spans', () => {
    expect(formatLength(30)).toBe('30 min');
    expect(formatLength(60)).toBe('1 h');
    expect(formatLength(90)).toBe('1 h 30 min');
    expect(formatTimeSpan('15:30', '16:00')).toBe('15:30 – 16:00');
    expect(formatTimeSpan('09:30', '')).toBe('9:30');
  });
});

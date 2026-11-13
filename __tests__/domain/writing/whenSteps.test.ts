// docs/dev/history/technical-design-quickadd-redesign.md §3.2, §7: the date and time strips' steps,
// every row of the time table, midnight and the minimums; the short warning and the usual date.
import {applyDateStep, applyTimeStep, dateSteps, shortLength, shortWarning, timeSteps} from '../../../src/domain/writing/whenSteps';
import {nextUsualDate} from '../../../src/domain/writing/meetingHints';

const view = (value: string, narrow = false) => {
  const s = timeSteps(value, narrow);
  return {info: s.info, steps: s.steps.map(x => `${x.label}${x.enabled ? '' : ' (off)'}`)};
};

describe('timeSteps', () => {
  it('has no steps for an empty or unreadable value', () => {
    expect(timeSteps('')).toEqual({info: null, steps: []});
    expect(timeSteps('15-14')).toEqual({info: null, steps: []});
    expect(timeSteps('abc')).toEqual({info: null, steps: []});
  });

  it('offers 1 h, the shifts and 1 d for a start only (scenario 9)', () => {
    expect(view('15:00')).toEqual({info: '15:00', steps: ['1 h', '‹ 30′', '30′ ›', '1 d']});
  });

  it('offers the lengths, the shifts and 1 d for a start and end', () => {
    expect(view('15:00-16:30')).toEqual({info: '1 h 30', steps: ['−30′', '+30′', '‹ 30′', '30′ ›', '1 d']});
  });

  it('greys −30′ at 30 minutes (scenario 11)', () => {
    expect(view('15:00-15:30').steps[0]).toBe('−30′ (off)');
    expect(view('15:00-15:30').info).toBe('30 min');
  });

  it('greys a shift or longer end past midnight, and an earlier shift before 00:00', () => {
    expect(view('23:40')).toEqual({info: '23:40', steps: ['1 h (off)', '‹ 30′', '30′ › (off)', '1 d']});
    expect(view('00:10')).toEqual({info: '0:10', steps: ['1 h', '‹ 30′ (off)', '30′ ›', '1 d']});
    expect(view('22:00-23:30').steps).toEqual(['−30′', '+30′ (off)', '‹ 30′', '30′ › (off)', '1 d']);
  });

  it('offers −1 d and +1 d for days and greys −1 d at one day (scenario 12)', () => {
    expect(view('2d')).toEqual({info: '2 days', steps: ['−1 d', '+1 d']});
    expect(view('1d')).toEqual({info: '1 day', steps: ['−1 d (off)', '+1 d']});
  });

  it('shortens the labels on a narrow screen', () => {
    expect(view('15:00-16:00', true).steps).toEqual(['−30', '+30', '‹', '›', '1 d']);
    expect(view('15:00', true).steps).toEqual(['1h', '‹', '›', '1 d']);
  });
});

describe('applyTimeStep', () => {
  it('sets the end one hour after the start (scenario 9)', () => {
    expect(applyTimeStep('15:00', 'len1h')).toBe('15:00-16:00');
  });

  it('moves the end, or start and end (scenario 10)', () => {
    expect(applyTimeStep('15:00-16:30', 'lenPlus30')).toBe('15:00-17:00');
    expect(applyTimeStep('15:00-17:00', 'shiftLater')).toBe('15:30-17:30');
    expect(applyTimeStep('15:00-16:30', 'lenMinus30')).toBe('15:00-16:00');
    expect(applyTimeStep('15:00-16:30', 'shiftEarlier')).toBe('14:30-16:00');
    expect(applyTimeStep('15:00', 'shiftLater')).toBe('15:30');
  });

  it('makes a whole-day meeting, and changes its days', () => {
    expect(applyTimeStep('15:00-16:30', 'day1')).toBe('1d');
    expect(applyTimeStep('2d', 'daysPlus1')).toBe('3d');
    expect(applyTimeStep('2d', 'daysMinus1')).toBe('1d');
  });

  it('leaves the value as it is for a step that cannot act', () => {
    expect(applyTimeStep('15:00-15:30', 'lenMinus30')).toBe('15:00-15:30');
    expect(applyTimeStep('1d', 'daysMinus1')).toBe('1d');
    expect(applyTimeStep('23:40', 'shiftLater')).toBe('23:40');
    expect(applyTimeStep('', 'len1h')).toBe('');
    expect(applyTimeStep('15:00', 'lenPlus30')).toBe('15:00');
  });
});

describe('dateSteps', () => {
  it('leads with the full date and offers the nudges', () => {
    expect(dateSteps('2026-11-13')).toEqual({
      info: 'Fri 13 Nov 2026',
      steps: [
        {id: 'dateMinus1', label: '-1', enabled: true},
        {id: 'dateToday', label: 'Today', enabled: true},
        {id: 'datePlus1', label: '+1', enabled: true},
        {id: 'datePlus7', label: '+7', enabled: true},
      ],
    });
    expect(dateSteps('13.').info).toBeNull();
  });

  it('nudges like the date strip always did', () => {
    const now = new Date(2026, 10, 11, 10, 0);
    expect(applyDateStep('2026-11-13', 'datePlus7', now)).toBe('2026-11-20');
    expect(applyDateStep('2026-11-13', 'dateMinus1', now)).toBe('2026-11-12');
    expect(applyDateStep('', 'datePlus1', now)).toBe('2026-11-12');
    expect(applyDateStep('2026-11-13', 'dateToday', now)).toBe('2026-11-11');
  });
});

describe('shortLength', () => {
  it('reads minutes, hours and both', () => {
    expect(shortLength(30)).toBe('30 min');
    expect(shortLength(60)).toBe('1 h');
    expect(shortLength(90)).toBe('1 h 30');
  });
});

describe('shortWarning', () => {
  it('says past, or the other meeting with its time (scenario 14)', () => {
    expect(shortWarning({kind: 'past'})).toBe('⚠ past');
    expect(shortWarning({kind: 'overlap', title: 'Team JF', time: '15:00'})).toBe('⚠ Team JF 15:00');
  });

  it('shortens a title over 12 characters', () => {
    expect(shortWarning({kind: 'overlap', title: 'Garden renovation sync', time: '09:30'})).toBe('⚠ Garden reno… 9:30');
  });
});

describe('nextUsualDate', () => {
  it('keeps the usual date when it is not before today', () => {
    expect(nextUsualDate({date: '2026-11-12'}, '2026-11-11')).toBe('2026-11-12');
  });

  it('finds the next date on the same weekday, today included', () => {
    // 2026-11-05 is a Thursday; from Wednesday 11.11. the next Thursday is the 12th.
    expect(nextUsualDate({date: '2026-11-05'}, '2026-11-11')).toBe('2026-11-12');
    expect(nextUsualDate({date: '2026-11-04'}, '2026-11-11')).toBe('2026-11-11');
  });
});

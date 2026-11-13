// docs/dev/history/technical-design-writing-help.md §3.3: what the strip shows, first that applies.
import {
  addAgainHint,
  overlapWarning,
  placeFeedback,
  StripState,
  stripContent,
  timeLabel,
  usualSlotLabel,
} from '../../../src/domain/writing/stripContent';

const usual = {date: '2026-11-17', time: '14:00', endTime: '14:45', minutes: 45};

function state(over: Partial<StripState>): StripState {
  return {field: 'text', value: '', fixes: [], moment: null, showClipboard: false, ...over};
}

describe('stripContent', () => {
  const fix = (n: number) => ({written: `t${n}`, suggestion: `x${n}`});

  it('1. shows up to two fixes before anything else', () => {
    expect(stripContent(state({fixes: [fix(1), fix(2), fix(3)], moment: {kind: 'feedback', text: 'f'}}))).toEqual({
      kind: 'fixes',
      fixes: [fix(1), fix(2)],
    });
  });

  it('2-5. shows the moment while no fix waits', () => {
    for (const moment of [
      {kind: 'read' as const, label: 'read as #daily'},
      {kind: 'choice' as const, options: [{value: '15:00', label: '15:00'}]},
      {kind: 'complete' as const, token: 'spa', options: [{tag: 'sparring'}]},
      {kind: 'feedback' as const, text: '✓ Daily · Meetings/Daily.note'},
    ]) {
      expect(stripContent(state({moment}))).toEqual(moment);
    }
  });

  it('Edit › shows the clipboard buttons instead of fixes', () => {
    expect(stripContent(state({fixes: [fix(1)], showClipboard: true}))).toEqual({kind: 'clipboard'});
  });

  it('6. a date field shows the full date with its warning and the usual slot it is given', () => {
    expect(stripContent(state({field: 'date', value: '2026-11-10', warning: 'past', usual}))).toEqual({
      kind: 'date',
      label: 'Tue 10 Nov 2026',
      warning: 'past',
      usual: 'Tue 17 Nov 14:00 · 45 min',
    });
    expect(stripContent(state({field: 'date', value: '', usual}))).toEqual({kind: 'date', label: null, warning: null, usual: 'Tue 17 Nov 14:00 · 45 min'});
    expect(stripContent(state({field: 'date', value: '2026-11-', warning: 'past'}))).toEqual({kind: 'date', label: null, warning: null, usual: null});
  });

  it('6. a time field shows the time and length, or the usual slot while empty', () => {
    expect(stripContent(state({field: 'time', value: '15:30-16:00', warning: 'overlaps Jour Fixe 15:00'}))).toEqual({
      kind: 'time',
      label: '15:30 – 16:00 · 30 min',
      warning: 'overlaps Jour Fixe 15:00',
    });
    expect(stripContent(state({field: 'time', value: '', usual}))).toEqual({kind: 'usual', usual: 'Tue 17 Nov 14:00 · 45 min'});
    expect(stripContent(state({field: 'time', value: ''}))).toEqual({kind: 'none'});
    expect(stripContent(state({field: 'time', value: 'soon'}))).toEqual({kind: 'none'});
  });

  it('7. a text field rests on the clipboard buttons', () => {
    expect(stripContent(state({value: 'call #lena'}))).toEqual({kind: 'clipboard'});
  });
});

describe('labels', () => {
  it('writes the time field', () => {
    expect(timeLabel('15:30-16:00')).toBe('15:30 – 16:00 · 30 min');
    expect(timeLabel('9.30')).toBe('9:30');
    expect(timeLabel('1d')).toBe('1 day');
    expect(timeLabel('3d')).toBe('3 days');
    expect(timeLabel('')).toBeNull();
  });

  it('writes the usual slot, the feedback, the hint and the warning', () => {
    expect(usualSlotLabel(usual)).toBe('Tue 17 Nov 14:00 · 45 min');
    expect(placeFeedback({setupName: 'Daily', setupTag: 'daily', home: null, file: 'Meetings/Daily 2026.note'})).toBe('#daily: Meetings/Daily 2026.note');
    expect(placeFeedback({setupName: 'Daily', setupTag: null, home: null, file: null})).toBe('Daily: own note');
    expect(placeFeedback({setupName: null, setupTag: null, home: 'project', file: 'Atruvia/Atruvia 2026.note'})).toBe('Project home note: Atruvia/Atruvia 2026.note');
    expect(placeFeedback({setupName: null, setupTag: null, home: 'area', file: 'Health/Health.note'})).toBe('Area home note: Health/Health.note');
    expect(placeFeedback({setupName: null, setupTag: null, home: null, file: null})).toBe('Own note');
    expect(addAgainHint([{written: 'DaiIy', suggestion: 'daily'}])).toBe('Check #DaiIy, or Add again to keep it');
    expect(addAgainHint([{written: 'retros', suggestion: 'retro'}, {written: 'Iena', suggestion: 'lena'}])).toBe(
      'Check #retros and #Iena, or Add again to keep them',
    );
    expect(overlapWarning('Jour Fixe', '09:00')).toBe('overlaps Jour Fixe 9:00');
  });
});

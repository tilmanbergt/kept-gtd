/** Given time, Worked on and Tend (docs/dev/history/technical-design-time-and-place.md §3.4, §6). */
import {contextMatcher, ContextDef} from '../../src/domain/contexts';
import {EngageItem, EngageSource} from '../../src/domain/engageOwner';
import {givenTimeDetail, givenTimeOf, givenTimeText, meetingMinutes, nothingPlanned, scheduledMinutes, tendCount, tendLineText} from '../../src/domain/givenTime';
import {LoopLine} from '../../src/domain/loopsSection';
import {deriveMeetingFields} from '../../src/domain/markdown';
import {Meeting} from '../../src/domain/types';
import {item, meeting, task} from '../../test-helpers/fixtures';

const WEEK = {start: '2026-10-12', end: '2026-10-18'};
const loopLine = (tag: string): LoopLine => ({tag, status: 'active', mainDate: null, linkedFile: null, extraColumns: [], raw: null});
const m = (date: string, title: string, extra: Partial<Meeting> = {}) => meeting(date, title, {...deriveMeetingFields(title), ...extra});
const done = (text: string, completion: string) => task(text, {done: true, fields: {due: null, created: null, completion, meeting: null, extra: []}});
const src = (items: EngageItem[], inboxMeetings: Meeting[] = []): EngageSource => ({
  items,
  inbox: {path: '/Note/0 Inbox', tasks: [], meetings: inboxMeetings},
  loopKinds: ['writing'],
  threadTypes: ['sparring'],
});
const all = contextMatcher(null);

describe('meetingMinutes and texts', () => {
  it('timed with and without end; all-day is 0', () => {
    expect(meetingMinutes(m('2026-10-14', 'x', {time: '09:00', endTime: '11:30'}))).toBe(150);
    expect(meetingMinutes(m('2026-10-14', 'x', {time: '09:00'}))).toBe(60);
    expect(meetingMinutes(m('2026-10-14', 'x'))).toBe(0);
  });
  it('reads hours, minutes and days', () => {
    expect(givenTimeText({minutes: 180, allDayDays: 0})).toBe('3 h');
    expect(givenTimeText({minutes: 90, allDayDays: 0})).toBe('1.5 h');
    expect(givenTimeText({minutes: 45, allDayDays: 0})).toBe('45 min');
    expect(givenTimeText({minutes: 0, allDayDays: 1})).toBe('1 day');
    expect(givenTimeText({minutes: 60, allDayDays: 2})).toBe('2 days · 1 h');
  });
});

describe('givenTimeOf', () => {
  const home = item('area', 'Home', {
    loops: [loopLine('writing/novel')],
    meetings: [
      m('2026-10-13', 'Writing #writing/novel #focusblock', {time: '09:00', endTime: '11:00'}),
      m('2026-10-15', 'Writing #writing/novel #focusblock', {time: '09:00', endTime: '10:00'}),
      m('2026-10-16', 'Garden day', {days: 2}),
      m('2026-10-14', 'Cancelled', {time: '09:00', cancelled: true}),
      m('2026-10-20', 'Next week', {time: '09:00'}),
    ],
    tasks: [task('Chapter 3 #writing/novel #next'), done('Old', '2026-10-01')],
  });
  const coaching = item('area', 'Coaching', {
    meetings: [m('2026-10-14', '1:1 Mieke #sparring/mieke', {time: '10:00', endTime: '11:00'}), m('2026-10-11', 'Long run #sparring/mieke', {days: 3})],
    tasks: [done('Sent slides #sparring/mieke', '2026-10-14')],
  });
  const web = item('project', 'Website', {tasks: [done('Logo', '2026-10-13'), done('Copy', '2026-10-14'), task('Draft homepage #next')]});
  const source = src([home, coaching, web], [m('2026-10-14', 'Dentist', {time: '16:00', endTime: '16:30'})]);
  const result = givenTimeOf({source, range: WEEK, matcher: all});

  it('sorts owners by time; all-day counts 8 h per covered day in the range; multi-day clipped', () => {
    expect(result.given.map(r => `${r.kindLabel} ${r.name} ${givenTimeText(r)}`)).toEqual([
      'Thread #sparring/mieke 2 days · 1 h',
      'Area Home 2 days',
      'Loop novel 3 h',
      'Inbox Inbox 30 min',
    ]);
  });
  it('a focus block counts for its loop as a block; a meeting once, for its thread', () => {
    const loop = result.given.find(r => r.kindLabel === 'Loop')!;
    expect(loop).toMatchObject({blocks: 2, meetings: 0, nextTodo: 'Chapter 3'});
    expect(givenTimeDetail(loop)).toBe('2 blocks · next: Chapter 3');
    const thread = result.given.find(r => r.kindLabel === 'Thread')!;
    expect(thread).toMatchObject({meetings: 2, done: 1});
  });
  it('Worked on: done in the range and nothing scheduled; earlier done todos never count', () => {
    expect(result.workedOn.map(r => `${r.name} ${r.done}`)).toEqual(['Website 2']);
    expect(result.given.find(r => r.name === 'Home')?.done).toBe(0);
  });
  it('the context leaves dimmed meetings and hidden todos out and counts their owners', () => {
    const work: ContextDef = {id: 'c', name: 'Work', shows: [{kind: 'item', itemKind: 'area', name: 'Coaching'}], hides: [], outsideMeetings: 'dim'};
    const filtered = givenTimeOf({source, range: WEEK, matcher: contextMatcher(work)});
    expect(filtered.given.map(r => r.name)).toEqual(['#sparring/mieke', 'Inbox']);
    expect(filtered.workedOn).toEqual([]);
    expect(filtered.hiddenOwners).toBe(3);
  });
});

describe('scheduledMinutes', () => {
  it('sums timed and all-day time in the range', () => {
    expect(scheduledMinutes([m('2026-10-13', 'a', {time: '09:00', endTime: '10:00'}), m('2026-10-18', 'b', {days: 2}), m('2026-10-30', 'c', {time: '09:00'})], WEEK)).toBe(60 + 480);
  });
});

describe('Tend', () => {
  const today = '2026-10-14';
  it('nothing planned: no next meeting, or one more than 14 days ahead', () => {
    expect(nothingPlanned(null, today)).toBe(true);
    expect(nothingPlanned('2026-10-28', today)).toBe(false);
    expect(nothingPlanned('2026-10-29', today)).toBe(true);
  });
  it('counts threads and loops, and the line', () => {
    const count = tendCount({threads: [{nextMeeting: null}, {nextMeeting: '2026-10-20'}, {nextMeeting: '2026-12-01'}], loops: [{nextMeeting: null}]}, today);
    expect(count).toEqual({threads: 2, loops: 1});
    expect(tendLineText(count)).toBe('Tend: 2 threads · 1 loop quiet ›');
    expect(tendLineText({threads: 0, loops: 0})).toBeNull();
  });
});

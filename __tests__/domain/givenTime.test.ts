/** Given time, Worked on and Tend (docs/dev/history/technical-design-time-and-place.md §3.4, §6). */
import {contextMatcher, ContextDef} from '../../src/domain/contexts';
import {EngageItem, EngageSource} from '../../src/domain/engageOwner';
import {belowThresholdText, GivenTimeRow, givenTimeDetail, givenTimeOf, givenTimeText, meetingMinutes, needsTending, nothingPlanned, scheduledMinutes, tendCount, tendLineText} from '../../src/domain/givenTime';
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
    meetings: [m('2026-10-14', '1:1 Jordan #sparring/jordan', {time: '10:00', endTime: '11:00'}), m('2026-10-11', 'Long run #sparring/jordan', {days: 3})],
    tasks: [done('Sent slides #sparring/jordan', '2026-10-14')],
  });
  const garage = item('project', 'Garage', {area: 'Home', meetings: [m('2026-10-14', 'Tool sort', {time: '17:00'})], tasks: [task('Sort tools #next')]});
  const web = item('project', 'Website', {tasks: [done('Logo', '2026-10-13'), done('Copy', '2026-10-14'), task('Draft homepage #next')]});
  const source = src([home, coaching, garage, web], [m('2026-10-14', 'Dentist', {time: '16:00', endTime: '16:30'})]);
  const result = givenTimeOf({source, range: WEEK, matcher: all, minMinutes: 60});
  const line = (r: GivenTimeRow) => `${r.kindLabel} ${r.name} ${givenTimeText(r)}`;

  it('Areas with their Projects, by time; all-day counts 8 h per covered day in the range; multi-day clipped; no Inbox', () => {
    expect(result.areas.map(line)).toEqual(['Area Home 2 days · 4 h', 'Area Coaching 2 days · 1 h']);
  });
  it('loops and counterparts in their own list: a meeting counts there once more', () => {
    expect(result.owners.map(line)).toEqual(['Counterpart jordan 2 days · 1 h', 'Loop novel 3 h']);
    const loop = result.owners.find(r => r.kindLabel === 'Loop')!;
    expect(loop).toMatchObject({blocks: 2, meetings: 0, nextTodo: 'Chapter 3'});
    expect(givenTimeDetail(loop)).toBe('2 blocks · next: Chapter 3');
    const jordan = result.owners.find(r => r.kindLabel === 'Counterpart')!;
    expect(jordan).toMatchObject({meetings: 2, done: 1});
    expect(givenTimeDetail(jordan)).toBe('sparring · 2 meetings · 1 done');
    expect(result.areas.find(r => r.name === 'Home')).toMatchObject({blocks: 2, meetings: 2});
  });
  it('the threshold leaves out loops and counterparts with less time', () => {
    expect(givenTimeOf({source, range: WEEK, matcher: all, minMinutes: 200}).owners.map(r => r.name)).toEqual(['jordan']);
  });
  it('Worked on: done in the range and nothing scheduled; earlier done todos never count', () => {
    expect(result.workedOn.map(r => `${r.name} ${r.done}`)).toEqual(['Website 2']);
    expect(result.areas.find(r => r.name === 'Home')?.done).toBe(0);
  });
  it('the context leaves dimmed meetings and hidden todos out and counts their owners', () => {
    const work: ContextDef = {id: 'c', name: 'Work', shows: [{kind: 'item', itemKind: 'area', name: 'Coaching'}], hides: [], outsideMeetings: 'dim'};
    const filtered = givenTimeOf({source, range: WEEK, matcher: contextMatcher(work), minMinutes: 60});
    expect(filtered.areas.map(r => r.name)).toEqual(['Coaching']);
    expect(filtered.owners.map(r => r.name)).toEqual(['jordan']);
    expect(filtered.workedOn).toEqual([]);
    expect(filtered.hiddenOwners).toBe(3);
  });
  it('a counterpart sums its threads and #wf todos in its scope; the same leaf in two scopes names the scope', () => {
    const team = item('area', 'Team', {
      meetings: [
        m('2026-10-13', 'Retro #retro/value', {time: '09:00', endTime: '10:00'}),
        m('2026-10-14', 'Review #review/value', {time: '09:00', endTime: '10:30'}),
        m('2026-10-15', 'Replenishment #replenishment/value', {time: '09:00', endTime: '09:30'}),
      ],
      tasks: [done('Got the numbers #wf/value', '2026-10-14'), task('Ask about scope #review/value #next')],
    });
    const homeArea = item('area', 'Home', {meetings: [m('2026-10-16', 'Value chat #retro/value', {time: '18:00', endTime: '19:00'})]});
    const three: EngageSource = {...src([team, homeArea]), threadTypes: ['retro', 'review', 'replenishment', 'wf', 'owe']};
    const owners = givenTimeOf({source: three, range: WEEK, matcher: all, minMinutes: 60}).owners;
    expect(owners.map(line)).toEqual(['Counterpart value · Team 3 h', 'Counterpart value · Home 1 h']);
    expect(givenTimeDetail(owners[0])).toBe('retro · review · replenishment · 3 meetings · 1 done · next: Ask about scope');
  });
  it('"Nothing above 1 h this week" when no loop or counterpart reaches the threshold', () => {
    expect(belowThresholdText(60, 'this week')).toBe('Nothing above 1 h this week');
    expect(belowThresholdText(0, 'this month')).toBe('Nothing this month');
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
  it('a counterpart needs tending with nothing planned and no next or I-owe todo', () => {
    const quiet = {nextMeeting: null, oweCount: 0, nextCount: 0};
    expect(needsTending(quiet, today)).toBe(true);
    expect(needsTending({...quiet, oweCount: 1}, today)).toBe(false);
    expect(needsTending({...quiet, nextCount: 1}, today)).toBe(false);
    expect(needsTending({...quiet, nextMeeting: '2026-10-20'}, today)).toBe(false);
    expect(needsTending({...quiet, nextMeeting: '2026-12-01'}, today)).toBe(true);
  });
  it('counts threads that need tending and loops that need a look, and the line', () => {
    const t = (nextMeeting: string | null, nextCount = 0) => ({nextMeeting, oweCount: 0, nextCount});
    const count = tendCount({threads: [t(null), t('2026-10-20'), t('2026-12-01'), t(null, 1)], loops: [{attention: 'noNext'}, {attention: null}]}, today);
    expect(count).toEqual({threads: 2, loops: 1});
    expect(tendLineText(count)).toBe('Tend: 2 counterparts · 1 loop quiet ›');
    expect(tendLineText({threads: 0, loops: 0})).toBeNull();
  });
});

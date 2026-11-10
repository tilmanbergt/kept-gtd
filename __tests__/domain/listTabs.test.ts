// domain/listTabs.ts and flowState's doneWithin (docs/dev/history/technical-design-calmer-screens.md §3.5).
import {doneWithin} from '../../src/domain/flowState';
import {currentTabOf, splitCurrent, splitDaily} from '../../src/domain/listTabs';
import {task} from '../../test-helpers/fixtures';

const TODAY = '2026-11-10';
const done = (text: string, completion: string) => task(text, {done: true, fields: {...task('x').fields, completion}});

describe('doneWithin', () => {
  it('counts a completion within the last n days, today included', () => {
    expect(doneWithin(done('a', '2026-11-10'), TODAY, 14)).toBe(true);
    expect(doneWithin(done('a', '2026-10-28'), TODAY, 14)).toBe(true);
    expect(doneWithin(done('a', '2026-10-27'), TODAY, 14)).toBe(false);
    expect(doneWithin(task('a'), TODAY, 14)).toBe(false);
    expect(doneWithin(task('a', {done: true}), TODAY, 14)).toBe(false);
  });
});

describe('splitDaily', () => {
  const entry = (text: string, extra: Parameters<typeof task>[1] = {}, kind = 'area') => ({task: task(text, extra), item: {kind}});
  it('splits Next and Waiting, lists the Inbox, counts open ones and the due ones under the bell', () => {
    const shown = [
      entry('a #next', {flowState: 'next'}),
      entry('b #wf/lena', {flowState: 'waiting-for', dueDate: '2026-11-09'}),
      entry('c #wf', {flowState: 'waiting-for'}),
      entry('d #next', {flowState: 'next', dueDate: TODAY}, 'inbox'),
      entry('e', {done: true, flowState: 'next'}),
    ];
    const split = splitDaily(shown, [entry('e', {done: true})], TODAY, true);
    expect(split.lists.next.map(e => e.task.text)).toEqual(['a #next', 'd #next', 'e']);
    expect(split.counts).toEqual({next: 2, waiting: 2, inbox: 1, done: 1});
    expect(split.bells).toEqual({waiting: 1, inbox: 1});
    expect(splitDaily(shown, [], TODAY, false).lists.next.map(e => e.task.text)).toEqual(['a #next', 'e']);
  });
});

describe('splitCurrent', () => {
  it('puts each open todo under its flow state, done ones of 14 days under Done, a just-done one in both', () => {
    const tasks = [
      task('a #next', {flowState: 'next'}),
      task('b #wf', {flowState: 'waiting-for'}),
      task('c'),
      task('d #someday', {flowState: 'someday'}),
      task('e #maybe', {flowState: 'maybe'}),
      {...done('f #next', '2026-11-07'), flowState: 'next' as const},
      done('g', '2026-10-20'),
      task('h', {cancelled: true}),
    ];
    const split = splitCurrent(tasks, TODAY, new Set([5]));
    expect(split.lists).toEqual({next: [0, 5], waiting: [1], plan: [2], someday: [3, 4], done: [5]});
    expect(split.counts).toEqual({next: 1, waiting: 1, plan: 1, someday: 2, done: 1});
    expect(splitCurrent(tasks, TODAY, new Set()).lists.next).toEqual([0]);
    expect(currentTabOf(task('x'))).toBe('plan');
  });
});

// docs/dev/history/technical-design-engage.md §3.2: options of an owner; the schedule screen's owner lines (time-and-place D28).
import {EngageItem, EngageSource} from '../../src/domain/engageOwner';
import {engageFlowText, engageListsOf, nextPromptOf, optionsOf, scheduleOwnerLines} from '../../src/domain/engageOptions';
import {LoopLine} from '../../src/domain/loopsSection';
import {ownerLineText} from '../../src/domain/engageText';
import {item, meeting, task} from '../../test-helpers/fixtures';

const NOW = new Date(2026, 9, 16, 12, 0).getTime();
const loopLine = (tag: string): LoopLine => ({tag, status: 'active', mainDate: null, linkedFile: null, extraColumns: [], raw: null});
const src = (items: EngageItem[]): EngageSource => ({items, inbox: {path: '/Note/0 Inbox', tasks: [], meetings: []}, loopKinds: ['proj'], threadTypes: ['sparring']});
const texts = (refs: Array<{task: {text: string}}>) => refs.map(r => r.task.text);

describe('optionsOf', () => {
  const loopItem = item('area', 'Coaching', {
    loops: [loopLine('proj/launch')],
    tasks: [
      task('Plan #proj/launch'),
      task('Brief #proj/launch #next'),
      task('Wait on Bob #proj/launch #wf/bob'),
      task('Someday thing #proj/launch #someday'),
      task('Maybe thing #proj/launch #maybe'),
      task('Now thing #proj/launch #now'),
      task('Book room #proj/launch'),
      task('Loose #next'),
    ],
  });
  const loop = {kind: 'loop' as const, itemPath: loopItem.path, tag: 'proj/launch'};

  it('#next (a retired #now too) and the plan, file order; waiting-for/someday/maybe never', () => {
    const o = optionsOf(loop, src([loopItem]), NOW);
    expect(texts(o.next)).toEqual(['Brief #proj/launch #next', 'Now thing #proj/launch #now']);
    expect(texts(o.plan)).toEqual(['Plan #proj/launch', 'Book room #proj/launch']);
    expect(o.ownerEmpty).toBe(false);
  });
  it('the current todo is in neither list', () => {
    const o = optionsOf(loop, src([loopItem]), NOW, {itemPath: loopItem.path, taskText: 'Brief #proj/launch #next', taskIndex: 1});
    expect(texts(o.next)).toEqual(['Now thing #proj/launch #now']);
  });
  it('an Area leaves its active loops\' todos out', () => {
    expect(texts(optionsOf({kind: 'item', itemPath: loopItem.path}, src([loopItem]), NOW).next)).toEqual(['Loose #next']);
  });
  it('ownerEmpty: no open todo and no meeting ahead', () => {
    const done = item('project', 'Done', {tasks: [task('x', {done: true})]});
    const owner = {kind: 'item' as const, itemPath: done.path};
    expect(optionsOf(owner, src([done]), NOW).ownerEmpty).toBe(true);
    const ahead = {...done, meetings: [meeting('2026-10-20', 'Review')]};
    expect(optionsOf(owner, src([ahead]), NOW).ownerEmpty).toBe(false);
    const past = {...done, meetings: [meeting('2026-10-01', 'Kickoff')]};
    expect(optionsOf(owner, src([past]), NOW).ownerEmpty).toBe(true);
    const waiting = {...done, tasks: [task('Wait #wf/bob')]};
    expect(optionsOf(owner, src([waiting]), NOW)).toMatchObject({next: [], plan: [], ownerEmpty: false});
  });
});

describe('scheduleOwnerLines', () => {
  // NOW is Fri 2026-10-16, 12:00.
  const area = item('area', 'Coaching', {
    loops: [loopLine('proj/launch')],
    threads: [{leaf: 'anna', status: 'active', rest: null, raw: null}],
    tasks: [task('Brief #proj/launch #next'), task('Loose #next')],
    meetings: [
      meeting('2026-10-16', 'Sparring Anna #sparring/anna', {tags: ['sparring/anna'], time: '15:00', endTime: '16:00'}),
      meeting('2026-10-16', 'Launch block #proj/launch #focusblock', {tags: ['proj/launch', 'focusblock'], time: '13:00', endTime: '14:00'}),
      meeting('2026-10-16', 'Morning #sparring/anna', {tags: ['sparring/anna'], time: '09:00', endTime: '10:00'}),
      meeting('2026-10-16', 'Again Anna #sparring/anna', {tags: ['sparring/anna'], time: '17:00', endTime: '18:00'}),
      meeting('2026-10-17', 'Tomorrow', {time: '09:00', endTime: '10:00'}),
    ],
  });
  const web = item('project', 'Website', {
    tasks: [task('Copy plan')],
    meetings: [meeting('2026-10-16', 'Fair'), meeting('2026-10-16', 'Cancelled', {time: '14:00', cancelled: true})],
  });

  it('today\'s meetings and focus blocks that are not over, by time, all-day last, one line per owner', () => {
    expect(scheduleOwnerLines(src([area, web]), NOW).map(ownerLineText)).toEqual([
      'Loop · launch · 1 next ›',
      'Thread · #sparring/anna · pick next ›',
      'Project · Website · pick next ›',
    ]);
  });

  it('leaves the current owner out, and is empty with nothing scheduled', () => {
    const current = {kind: 'loop' as const, itemPath: area.path, tag: 'proj/launch'};
    expect(scheduleOwnerLines(src([area, web]), NOW, current).map(l => l.name)).toEqual(['#sparring/anna', 'Website']);
    expect(scheduleOwnerLines(src([item('project', 'Quiet', {tasks: [task('x #next')]})]), NOW)).toEqual([]);
  });
});

describe('engageFlowText', () => {
  it('picks, parks and removes #next; leaving #next drops #now', () => {
    expect(engageFlowText('Brief #proj/launch', 'next')).toBe('Brief #proj/launch #next');
    expect(engageFlowText('Brief #next #now', null)).toBe('Brief');
    expect(engageFlowText('Brief #next', 'someday')).toBe('Brief #someday');
    expect(engageFlowText('Brief #now #next', 'next')).toBe('Brief #now #next');
  });
});

describe('nextPromptOf (R5)', () => {
  const loopItem = item('area', 'Coaching', {
    loops: [loopLine('proj/launch')],
    tasks: [
      task('Brief #proj/launch #next', {done: true}),
      task('Plan #proj/launch'),
      task('Book #proj/launch'),
      task('Call #proj/launch'),
      task('Print #proj/launch'),
      task('Loose #next'),
    ],
  });
  it('the owner\'s last #next done and a plan left: up to three plan todos', () => {
    const prompt = nextPromptOf(loopItem.path, task('x', {tags: ['proj/launch', 'next']}), src([loopItem]), NOW);
    expect(prompt?.owner).toEqual({kind: 'loop', itemPath: loopItem.path, tag: 'proj/launch'});
    expect(texts(prompt!.candidates)).toEqual(['Plan #proj/launch', 'Book #proj/launch', 'Call #proj/launch']);
  });
  it('none while a #next is left, without a plan, or for an unknown item', () => {
    expect(nextPromptOf(loopItem.path, task('x', {tags: []}), src([loopItem]), NOW)).toBeNull();
    const noPlan = {...loopItem, tasks: [task('Brief #proj/launch #next', {done: true})]};
    expect(nextPromptOf(loopItem.path, task('x', {tags: ['proj/launch']}), src([noPlan]), NOW)).toBeNull();
    expect(nextPromptOf('/nowhere', task('x', {tags: []}), src([loopItem]), NOW)).toBeNull();
  });
});

describe('engageListsOf (Next and Plan tabs)', () => {
  const owner = item('project', 'Garden', {tasks: [task('Measure #next'), task('Dig #next'), task('Buy soil'), task('Call #next')]});
  const o = {kind: 'item' as const, itemPath: owner.path};
  it('the current todo is in the Now box; the other #next fill the Next tab', () => {
    const current = {item: {kind: 'project' as const, name: 'Garden', path: owner.path, abbrev: null}, taskIndex: 1, task: owner.tasks[1]};
    const lists = engageListsOf(optionsOf(o, src([owner]), NOW, {itemPath: owner.path, taskText: 'Dig #next', taskIndex: 1}), current);
    expect(lists.nowKind).toBe('current');
    expect(texts(lists.next)).toEqual(['Measure #next', 'Call #next']);
    expect(texts(lists.plan)).toEqual(['Buy soil']);
  });
  it('several #next and nothing chosen: no Now box', () => {
    const lists = engageListsOf(optionsOf(o, src([owner]), NOW), null);
    expect(lists.nowTodo).toBeNull();
    expect(lists.next).toHaveLength(3);
  });
  it('a single #next moves up into the Now box, the Next tab is empty', () => {
    const single = {...owner, tasks: [task('Measure #next'), task('Buy soil')]};
    const lists = engageListsOf(optionsOf(o, src([single]), NOW), null);
    expect(lists.nowKind).toBe('single');
    expect(lists.nowTodo?.task.text).toBe('Measure #next');
    expect(lists.next).toEqual([]);
  });
});

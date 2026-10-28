/** The context panel's model and Quick Add parts (docs/dev/history/technical-design-time-and-place.md §3.2, §6). */
import {EngageItem, EngageSource, MeetingEntryRef, itemRefOf} from '../../src/domain/engageOwner';
import {meetingContextOf} from '../../src/domain/meetingContext';
import {quickAddPartsFor} from '../../src/domain/meetingQuickAdd';
import {deriveMeetingFields} from '../../src/domain/markdown';
import {LoopLine} from '../../src/domain/loopsSection';
import {Meeting} from '../../src/domain/types';
import {item, meeting, task} from '../../test-helpers/fixtures';

// Fri 16.10.2026, noon.
const NOW = new Date(2026, 9, 16, 12, 0).getTime();
const loopLine = (tag: string): LoopLine => ({tag, status: 'active', mainDate: null, linkedFile: null, extraColumns: [], raw: null});
const src = (items: EngageItem[]): EngageSource => ({items, inbox: {path: '/Note/0 Inbox', tasks: [], meetings: []}, loopKinds: ['writing'], threadTypes: ['sparring']});
const m = (date: string, title: string, extra: Partial<Meeting> = {}) => meeting(date, title, {time: '10:00', endTime: '11:00', ...deriveMeetingFields(title), ...extra});
const entry = (it: EngageItem, meetingIndex: number): MeetingEntryRef => ({item: itemRefOf(it), meetingIndex, meeting: it.meetings[meetingIndex]});
const texts = (refs: Array<{task: {text: string}}>) => refs.map(r => r.task.text);
const KEY_LAST = '2026-10-09 1:1 Mieke sparring/mieke';

describe('meetingContextOf: thread', () => {
  const coaching = item('area', 'Coaching', {
    meetings: [m('2026-10-09', '1:1 Mieke #sparring/mieke'), m('2026-10-19', '1:1 Mieke #sparring/mieke')],
    tasks: [
      task('Send the slides #next', {fields: {due: null, created: null, completion: null, meeting: KEY_LAST, extra: []}}),
      task('Read her draft #sparring/mieke #next'),
      task('Old habit #sparring/mieke #now'),
      task('Her feedback #wf/mieke'),
      task('Someday #sparring/mieke #someday'),
    ],
  });
  const model = meetingContextOf(entry(coaching, 1), src([coaching]), NOW);
  it('names the thread and lists I owe, Next (#now as #next), Waiting for and Agreed last time', () => {
    expect(model.mode).toBe('owner');
    expect(model.owner).toEqual({kind: 'thread', scopeOwnerPath: coaching.path, tag: 'sparring/mieke'});
    expect(model.ownerTitle?.name).toBe('#sparring/mieke');
    expect(texts(model.owe)).toEqual(['Send the slides #next']);
    expect(texts(model.next)).toEqual(['Read her draft #sparring/mieke #next', 'Old habit #sparring/mieke #now']);
    expect(texts(model.waiting)).toEqual(['Her feedback #wf/mieke']);
    expect(model.agreed?.caption).toBe('Agreed last time');
    expect(model.agreed?.group.meeting.meeting.date).toBe('2026-10-09');
  });
});

describe('meetingContextOf: loop and focus block', () => {
  const home = item('area', 'Home', {
    loops: [loopLine('writing/novel')],
    meetings: [m('2026-10-17', 'Writing session #writing/novel #focusblock')],
    tasks: [task('Chapter 3 #writing/novel #next'), task('Outline #writing/novel')],
  });
  it('the loop owns the block; Next and Planned apart; From its meetings is the caption', () => {
    const model = meetingContextOf(entry(home, 0), src([home]), NOW);
    expect(model.owner).toEqual({kind: 'loop', itemPath: home.path, tag: 'writing/novel'});
    expect(texts(model.next)).toEqual(['Chapter 3 #writing/novel #next']);
    expect(texts(model.planned)).toEqual(['Outline #writing/novel']);
    expect(model.agreed).toBeNull();
  });
});

describe('meetingContextOf: plain meeting', () => {
  const steering = m('2026-10-15', 'Steering committee');
  it('with nothing linked shows the owner\'s lens', () => {
    const web = item('project', 'Website', {meetings: [steering], tasks: [task('Draft homepage #next'), task('Logo #wf/lena')]});
    const model = meetingContextOf(entry(web, 0), src([web]), NOW);
    expect(model.mode).toBe('owner-lens');
    expect(texts(model.next)).toEqual(['Draft homepage #next']);
    expect(texts(model.waiting)).toEqual(['Logo #wf/lena']);
  });
  it('with todos agreed in it lists only those, as Agreed here', () => {
    const key = '2026-10-15 Steering committee';
    const web = item('project', 'Website', {
      meetings: [steering],
      tasks: [task('Draft homepage #next'), task('Send minutes', {fields: {due: null, created: null, completion: null, meeting: key, extra: []}})],
    });
    const model = meetingContextOf(entry(web, 0), src([web]), NOW);
    expect(model.mode).toBe('this-meeting');
    expect(model.agreed?.caption).toBe('Agreed here');
    expect(model.agreed?.group.rows.map(r => (r.kind === 'todo' ? r.todo.task.text : ''))).toEqual(['Send minutes']);
    expect(model.next).toEqual([]);
  });
  it('with a todo carrying the meeting\'s own tag lists it', () => {
    const tagged = m('2026-10-19', 'Budget #budget');
    const web = item('project', 'Website', {abbrev: 'WEB', meetings: [tagged], tasks: [task('Numbers #budget #next'), task('Other #next')]});
    const model = meetingContextOf(entry(web, 0), src([web]), NOW);
    expect(model.mode).toBe('this-meeting');
    expect(texts(model.next)).toEqual(['Numbers #budget #next']);
  });
  it('a cancelled meeting still shows its owner', () => {
    const web = item('project', 'Website', {meetings: [{...steering, cancelled: true}], tasks: [task('Draft homepage #next')]});
    expect(texts(meetingContextOf(entry(web, 0), src([web]), NOW).next)).toEqual(['Draft homepage #next']);
  });
  it('an Inbox meeting has no owner', () => {
    const inboxEntry: MeetingEntryRef = {item: {kind: 'inbox', name: 'Inbox', path: '/Note/0 Inbox', abbrev: null}, meetingIndex: 0, meeting: steering};
    expect(meetingContextOf(inboxEntry, src([]), NOW)).toMatchObject({owner: null, mode: 'this-meeting', next: []});
  });
});

describe('quickAddPartsFor', () => {
  const mtg = m('2026-10-19', '1:1 Mieke #sparring/mieke');
  const thread = {kind: 'thread' as const, scopeOwnerPath: '/x', tag: 'sparring/mieke'};
  const loop = {kind: 'loop' as const, itemPath: '/x', tag: 'writing/novel'};
  const itemOwner = {kind: 'item' as const, itemPath: '/x'};
  it('before: the thread or loop tag only; a plain meeting nothing', () => {
    expect(quickAddPartsFor(thread, mtg, 'before')).toEqual({presetTag: 'sparring/mieke', provenance: null});
    expect(quickAddPartsFor(loop, mtg, 'before')).toEqual({presetTag: 'writing/novel', provenance: null});
    expect(quickAddPartsFor(itemOwner, mtg, 'before')).toEqual({presetTag: null, provenance: null});
  });
  it('during and after: also the meeting', () => {
    expect(quickAddPartsFor(thread, mtg, 'during')).toEqual({presetTag: 'sparring/mieke', provenance: mtg});
    expect(quickAddPartsFor(itemOwner, mtg, 'after')).toEqual({presetTag: null, provenance: mtg});
  });
  it('no owner or moment: nothing', () => {
    expect(quickAddPartsFor(null, null, null)).toEqual({presetTag: null, provenance: null});
  });
});

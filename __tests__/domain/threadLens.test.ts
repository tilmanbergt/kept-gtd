// docs/dev/history/technical-design-engage-in-context.md §2.1, technical-design-tending-threads.md §1.2.1:
// the pure thread lens - scope, the lens's tags and how a todo relates to a thread.
import {deriveMeetingFields} from '../../src/domain/markdown';
import {meetingKey} from '../../src/domain/provenance';
import {emptyTaskFields} from '../../src/domain/taskLine';
import {LensSource, threadLensContext, ThreadLensContext} from '../../src/domain/threadLens';
import {Meeting, Task} from '../../src/domain/types';
import {item, meeting, task} from '../../test-helpers/fixtures';

const INBOX = '/Note/2 Areas/0 Inbox';

function m(date: string, title: string, extra: Partial<Meeting> = {}): Meeting {
  return meeting(date, title, {...deriveMeetingFields(title), ...extra});
}
function agreedIn(text: string, mt: Meeting, extra: Partial<Task> = {}): Task {
  return task(text, {fields: {...emptyTaskFields(), meeting: meetingKey(mt)}, ...extra});
}

type Item = ReturnType<typeof item>;
const sourceOf = (it: Item): LensSource => ({ref: {kind: it.kind, name: it.name, path: it.path, abbrev: it.abbrev}, tasks: it.tasks, meetings: it.meetings});
const inboxSource = (tasks: Task[], meetings: Meeting[] = []): LensSource => ({ref: {kind: 'inbox', name: 'Inbox', path: INBOX, abbrev: null}, tasks, meetings});

/** Every open todo of the scope with its relation, as "text: relation". */
function relations(ctx: ThreadLensContext): string[] {
  return ctx.inScope.flatMap(s => s.tasks.filter(t => !t.done && !t.cancelled).map(t => `${t.text}: ${ctx.relationOf(t) ?? '-'}`));
}

describe('threadLensContext - scope and owner', () => {
  const retro = m('2026-09-30', 'Retro #retro/alpha');
  const coaching = item('area', 'Coaching', {meetings: [retro], tasks: [task('Draft agenda #retro/alpha')]});
  const tender = item('project', 'Tender', {area: 'Coaching', tasks: [task('Prepare slides #retro/alpha/2026')]});
  const elsewhere = item('area', 'Health', {tasks: [task('Elsewhere #retro/alpha')], meetings: [m('2026-10-15', 'Retro #retro/alpha')]});
  const items = [coaching, tender, elsewhere];
  const sources = [...items.map(sourceOf), inboxSource([task('Inbox thing #retro/alpha')])];
  const ctx = (owner: string | null, lens: 'thread' | 'counterpart' = 'thread', tag = 'retro/alpha') =>
    threadLensContext(items, sources, INBOX, tag, lens, owner);

  it('scopes to the owner Area and its Projects; a Project widens to its Area', () => {
    expect(ctx(coaching.path)!.scope.sort()).toEqual([coaching.path, tender.path].sort());
    expect(ctx(tender.path, 'counterpart')!.scope.sort()).toEqual([coaching.path, tender.path].sort());
  });

  it('keeps the Inbox on its own, in scope only as the owner', () => {
    expect(ctx(INBOX)!.scope).toEqual([INBOX]);
    expect(ctx(INBOX)!.owner).toMatchObject({kind: 'inbox'});
    expect(ctx(coaching.path)!.inScope.map(s => s.ref.kind)).not.toContain('inbox');
  });

  it('falls back to the item with the latest meeting of the thread', () => {
    expect(ctx(null)!.owner?.path).toBe(elsewhere.path);
  });

  it('is null for a plain tag; wf/owe always take the counterpart lens', () => {
    expect(ctx(coaching.path, 'thread', 'retro')).toBeNull();
    expect(ctx(coaching.path, 'thread', 'wf/alpha')!.lens).toBe('counterpart');
    expect(ctx(coaching.path, 'thread', 'owe/alpha')!.lens).toBe('counterpart');
  });

  it('inLens: thread tag, deeper and the plain leaf; never the plain parent', () => {
    const c = ctx(coaching.path)!;
    expect(c.inLens(['retro/alpha'])).toBe(true);
    expect(c.inLens(['retro/alpha/2026'])).toBe(true);
    expect(c.inLens(['alpha'])).toBe(true);
    expect(c.inLens(['retro'])).toBe(false);
    expect(c.inLens(['review/alpha'])).toBe(false);
  });
});

describe('threadLensContext - how a todo relates to a thread (§1.2.1)', () => {
  const jordan1 = m('2026-09-30', '1:1 Jordan #101/jordan', {time: '09:00', endTime: '09:30'});
  const jordan2 = m('2026-10-06', '1:1 Jordan #101/jordan', {time: '09:00', endTime: '09:30'});
  const sam = m('2026-10-01', '1:1 Sam #101/sam', {time: '09:00', endTime: '09:30'});
  const team = item('area', 'Team', {
    meetings: [jordan1, jordan2, sam],
    tasks: [
      agreedIn('Raise budget question #101/sam', jordan1),
      agreedIn('Agreed only', jordan2),
      agreedIn('Agreed and tagged #101/jordan', jordan2),
      task('Tagged only #101/jordan'),
      task('Leaf only #jordan #next'),
      task('Promised #owe/jordan #next'),
      task('Bare owe #owe #101/sam'),
      task('Contract #wf/jordan'),
      agreedIn('Her feedback #wf', jordan2),
      task('Her slides #wf #101/jordan'),
      agreedIn("Sam's numbers #wf/sam", jordan2),
      task('Untagged bare wf #wf'),
      task('Bare wf with a promise #wf #owe/jordan'),
    ],
  });
  const sources = [sourceOf(team), inboxSource([agreedIn('Still in the Inbox', jordan2)])];
  const ctx = (tag: string, lens: 'thread' | 'counterpart' = 'thread') => threadLensContext([team], sources, INBOX, tag, lens, team.path)!;

  it('classifies every open todo once: waiting, then owe, then relevant', () => {
    expect(relations(ctx('101/jordan'))).toEqual([
      'Raise budget question #101/sam: owe',
      'Agreed only: owe',
      'Agreed and tagged #101/jordan: owe',
      'Tagged only #101/jordan: relevant',
      'Leaf only #jordan #next: relevant',
      'Promised #owe/jordan #next: owe',
      'Bare owe #owe #101/sam: -',
      'Contract #wf/jordan: waiting',
      'Her feedback #wf: waiting',
      'Her slides #wf #101/jordan: waiting',
      "Sam's numbers #wf/sam: owe",
      'Untagged bare wf #wf: -',
      'Bare wf with a promise #wf #owe/jordan: owe',
    ]);
  });

  it('agreed with Jordan and tagged #101/sam: Relevant for Sam; #wf/sam is waiting there', () => {
    const svens = ctx('101/sam');
    const of = (text: string) => svens.relationOf(team.tasks.find(t => t.text === text)!);
    expect(of('Raise budget question #101/sam')).toBe('relevant');
    expect(of('Bare owe #owe #101/sam')).toBe('relevant');
    expect(of("Sam's numbers #wf/sam")).toBe('waiting');
  });

  it('resolves provenance to the meeting the todo was agreed in', () => {
    const match = ctx('101/jordan').provenanceOf(team.tasks[1])!;
    expect(match).toMatchObject({path: team.path, meetingIndex: 1});
    expect(ctx('101/jordan').provenanceOf(team.tasks[3])).toBeNull();
  });

  it('the counterpart lens collects every thread of the counterpart', () => {
    const all = ctx('101/jordan', 'counterpart');
    expect(all.relationOf(task('x #101/jordan'))).toBe('relevant');
    expect(all.relationOf(task('x #wf #owe/jordan'))).toBe('owe');
    expect(all.types).toEqual(['101', 'owe', 'wf']);
  });
});

/**
 * Golden master of the thread views on an Team-sized scope
 * (docs/dev/history/technical-design-perf-threads.md §7, R1 "same results, less work").
 * The results were recorded once, before any of the performance changes, into
 * `__golden__/bigScope.json`. The file is never updated to make this test pass: a
 * difference means the new code computes something else.
 *
 * Recording (only for a new data set, never for a changed result):
 *   GOLDEN_WRITE=1 npx jest __tests__/storage/bigScopeGolden.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import {agreementMadeIn} from '../../src/domain/agreementOwner';
import {Agreement} from '../../src/domain/agreements';
import {threadTypesOf} from '../../src/domain/counterparts';
import {agreedInMeeting, EngageSource, threadOfTodo} from '../../src/domain/engageOwner';
import {loopKindsOf} from '../../src/domain/loops';
import {ProvenanceMatch, ProvenanceSource, resolveProvenance} from '../../src/domain/provenance';
import {scopeOf} from '../../src/domain/threads';
import {Task} from '../../src/domain/types';
import {counterpartScopes} from '../../src/domain/counterparts';
import {CachedItem} from '../../src/storage/dataCache';
import {buildScopeRoster, buildTendingRoster, RosterEntry, RosterScope} from '../../src/storage/tendingRoster';
import {buildThreadOverview, counterpartMatcher, ThreadMeetingEntry, ThreadOverview, ThreadTaskEntry} from '../../src/storage/threadAggregate';
import {AgreementRef} from '../../src/domain/agreementOwner';
import {BIG_NOW, BIG_SETUP_TAGS, bigScopeCache} from '../../test-helpers/bigScope';

jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));

const GOLDEN = path.join(__dirname, '__golden__', 'bigScope.json');

const {items, inbox, team} = bigScopeCache();
const setups = BIG_SETUP_TAGS.map(s => ({enabled: true, kind: s.kind, tags: [s.tag]}));
const ruleTypes = threadTypesOf(setups);
const nameOf = (p: string) => (p === inbox.path ? 'Inbox' : items.find(i => i.path === p)?.name ?? p);

// Entries are written as `<item>:<list><index>`, so the golden file stays readable and
// still pins every row, its order and its index into the full array.
const taskRef = (e: ThreadTaskEntry) => `${e.item.name}:t${e.taskIndex}`;
const meetingRef = (e: ThreadMeetingEntry) => `${e.item.name}:m${e.meetingIndex}`;
const agreementRef = (r: AgreementRef) => `${nameOf(r.itemPath)}:a${r.index}`;
const matchRef = (m: ProvenanceMatch | null) => (m ? `${nameOf(m.path)}:m${m.meetingIndex}${m.exact ? '' : ' (fallback)'}` : null);

function overviewOut(o: ThreadOverview | null) {
  if (!o) return null;
  return {
    lens: o.lens,
    thread: o.thread.tag,
    owner: o.owner?.name ?? null,
    scope: o.scope.map(nameOf),
    types: o.types,
    ahead: {
      meetings: o.ahead.meetings.map(meetingRef),
      owe: o.ahead.owe.map(taskRef),
      waiting: o.ahead.waiting.map(taskRef),
      relevant: o.ahead.relevant.map(taskRef),
      someday: o.ahead.someday.map(taskRef),
      agreements: o.ahead.agreements.map(agreementRef),
    },
    endedAgreements: o.endedAgreements.map(agreementRef),
    since: {from: o.since.from, done: o.since.done.map(taskRef)},
    past: o.past.map(p => ({
      meeting: meetingRef(p.entry),
      key: p.key,
      agreed: p.agreed.map(taskRef),
      agreements: p.agreements.map(agreementRef),
      counts: p.counts,
    })),
  };
}

function entryOut(e: RosterEntry) {
  const cp = e.counterpart;
  return {
    leaf: cp.leaf,
    status: cp.status,
    threads: cp.threads.map(t => t.tag),
    oneOff: cp.oneOff,
    inUse: cp.inUse,
    backInUse: cp.backInUse,
    owner: e.owner.name,
    tag: e.tag,
    lastMeeting: e.lastMeeting,
    nextMeeting: e.nextMeeting,
    oweCount: e.oweCount,
    waitingCount: e.waitingCount,
    oldestWaitingDays: e.oldestWaitingDays,
    overview: overviewOut(e.overview),
  };
}

const scopeOut = (s: RosterScope) => ({owner: s.owner.name, confirm: s.confirm.map(entryOut), active: s.active.map(entryOut), inactive: s.inactive.map(entryOut)});

/** Every todo and agreement of every file, with its file. */
function allEntries(): Array<{itemPath: string; label: string; entry: Task | Agreement; isTodo: boolean}> {
  const out: Array<{itemPath: string; label: string; entry: Task | Agreement; isTodo: boolean}> = [];
  for (const it of items) {
    it.tasks.forEach((t, i) => out.push({itemPath: it.path, label: `${it.name}:t${i}`, entry: t, isTodo: true}));
    it.agreements.forEach((a, i) => out.push({itemPath: it.path, label: `${it.name}:a${i}`, entry: a, isTodo: false}));
  }
  inbox.tasks.forEach((t, i) => out.push({itemPath: inbox.path, label: `Inbox:t${i}`, entry: t, isTodo: true}));
  return out;
}

function results() {
  const scope = counterpartScopes(items).find(s => s.owner === team)!;
  const sources: ProvenanceSource[] = [...items.map(i => ({path: i.path, meetings: i.meetings})), {path: inbox.path, meetings: inbox.meetings}];
  const engage: EngageSource = {items, inbox, loopKinds: loopKindsOf(setups), threadTypes: ruleTypes};
  const overviewTags = ['101/anna', 'retro/alpha', 'jf/board', 'wf/olga', 'sparring/jordan'];
  const matchers = ['101/bert', 'retro/gamma', 'owe/quinn'];
  const everyTodo: Array<{item: CachedItem | null; task: Task}> = [
    ...items.flatMap(it => it.tasks.map(task => ({item: it, task}))),
    ...inbox.tasks.map(task => ({item: null, task})),
  ];
  return {
    scopeRoster: scopeOut(buildScopeRoster(items, inbox, scope, ruleTypes, BIG_NOW)),
    tendingRoster: buildTendingRoster(items, inbox, ruleTypes, BIG_NOW).map(scopeOut),
    overviews: overviewTags.flatMap(tag =>
      (['thread', 'counterpart'] as const).flatMap(lens => [
        {tag, lens, owner: 'Team', overview: overviewOut(buildThreadOverview(items, inbox, tag, lens, team.path, BIG_NOW))},
        {tag, lens, owner: null, overview: overviewOut(buildThreadOverview(items, inbox, tag, lens, null, BIG_NOW))},
      ]),
    ),
    counterpartMatcher: matchers.map(tag => {
      const m = counterpartMatcher(items, inbox, tag, team.path)!;
      return {
        tag,
        tasks: everyTodo.filter(e => m.task(e.task)).map(e => `${e.item?.name ?? 'Inbox'}:t${(e.item?.tasks ?? inbox.tasks).indexOf(e.task)}`),
        meetings: [...items.flatMap(it => it.meetings.map((mt, i) => ({mt, ref: `${it.name}:m${i}`}))), ...inbox.meetings.map((mt, i) => ({mt, ref: `Inbox:m${i}`}))]
          .filter(e => m.meeting(e.mt))
          .map(e => e.ref),
      };
    }),
    provenance: allEntries().map(e => ({entry: e.label, match: matchRef(resolveProvenance(e.entry, sources, scopeOf(e.itemPath, items, inbox.path)))})),
    engage: allEntries()
      .filter(e => e.itemPath !== inbox.path)
      .map(e =>
        e.isTodo
          ? {
              entry: e.label,
              threadOfTodo: threadOfTodo(e.itemPath, e.entry as Task, engage),
              agreedInMeeting: (() => {
                const r = agreedInMeeting(e.itemPath, e.entry as Task, engage);
                return r ? `${r.item.name}:m${r.meetingIndex}` : null;
              })(),
            }
          : {entry: e.label, agreementMadeIn: agreementMadeIn({itemPath: e.itemPath, index: 0, agreement: e.entry as Agreement}, engage)},
      ),
  };
}

describe('golden master: thread views on a big scope (perf-threads §7)', () => {
  const now = JSON.parse(JSON.stringify(results()));

  if (process.env.GOLDEN_WRITE === '1') {
    it('records the golden file', () => {
      fs.mkdirSync(path.dirname(GOLDEN), {recursive: true});
      fs.writeFileSync(GOLDEN, JSON.stringify(now, null, 1) + '\n');
    });
    return;
  }

  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  for (const key of Object.keys(golden)) {
    it(`${key} is unchanged`, () => {
      expect(now[key]).toEqual(golden[key]);
    });
  }

  it('covers the cases of §6 scenarios 2-5', () => {
    const match = (label: string) => now.provenance.find((p: {entry: string}) => p.entry === label)?.match;
    const atruviaTodo = (start: string) => `Team:t${team.tasks.findIndex(t => t.text.startsWith(start))}`;
    const tender = items.find(i => i.name === 'Tender')!;
    const tenderTodo = (start: string) => `Tender:t${tender.tasks.findIndex(t => t.text.startsWith(start))}`;
    // The hand-made meeting with this title: the one on the date the todo's key names.
    const atruviaMeeting = (title: string, todoStart: string, nth = 0) => {
      const todo = [...team.tasks, ...tender.tasks].find(t => t.text.startsWith(todoStart))!;
      const date = todo.fields.meeting!.slice(0, 10);
      const at = team.meetings.map((m, i) => (m.title === title && m.date === date ? i : -1)).filter(i => i >= 0);
      return `Team:m${at[nth]}`;
    };
    // 2. Scope first; only another Area has it.
    expect(match(atruviaTodo('Offsite notes out'))).toBe(atruviaMeeting('Strategy offsite #jf/board', 'Offsite notes out'));
    expect(match(atruviaTodo('Zen planning follow-up'))).toBe('Zen:m1');
    // 3. First in file.
    expect(match(atruviaTodo('Greta: send'))).toBe(atruviaMeeting('1:1 Greta #101/greta', 'Greta: send'));
    // 4. A cancelled meeting named exactly matches; the fallback skips a cancelled one.
    expect(match(atruviaTodo('Carla: the cancelled'))).toBe(atruviaMeeting('1:1 Carla #101/carla', 'Carla: the cancelled'));
    expect(match(atruviaTodo('Dirk: renamed and cancelled'))).toBeNull();
    // 5. Renamed: found by date and thread; moved to another day as well: nothing.
    expect(match(tenderTodo('Eva: goals draft'))).toBe(`${atruviaMeeting('1:1 Eva - goals #101/eva', 'Eva: goals draft')} (fallback)`);
    expect(match(tenderTodo('Bert: hand over'))).toBe(`${atruviaMeeting('1:1 Bert (short) #101/bert', 'Bert: hand over')} (fallback)`);
    expect(match(tenderTodo('Frank: the moved meeting'))).toBeNull();
  });
});

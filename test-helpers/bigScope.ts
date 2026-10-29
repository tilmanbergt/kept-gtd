/**
 * A deterministic, Team-sized data set for the Threads performance work
 * (docs/dev/history/technical-design-perf-threads.md §6 scenario 1, §7): one Area
 * (Team) with two Projects, about 25 counterparts, 130 meetings and 90 todos,
 * half of them agreed in a meeting, agreements with a `meeting` field, Inbox
 * entries, and around it a second Area (Zen) and a lone Project (Solo).
 *
 * Seeded (Park-Miller) with a fixed "now", so every run builds the same files. The
 * cases of §6 scenarios 2-5 are written in by hand:
 * - scope first: a meeting line that exists in Team and in Zen, and one only in Zen;
 * - first in file: the same meeting line twice in Team's file;
 * - cancelled: a todo naming a cancelled meeting exactly, and one whose renamed meeting
 *   (same date and thread) is cancelled;
 * - renamed: two todos whose meeting was renamed (same date and thread), and one whose
 *   meeting also moved to another day.
 *
 * The files are what a user would have on disk (`files`); `bigScopeCache` parses them
 * the way the cache does, for unit tests. Scenario tests put `files` on the fake device.
 */
import {parseAgreementsSpan} from '../src/domain/agreements';
import {parseLoopsSpan} from '../src/domain/loopsSection';
import {parseFrontMatter, parseMeetingsSpan, parseTasksSpan} from '../src/domain/markdown';
import {meetingKey} from '../src/domain/provenance';
import {createNoteSetup, seedNoteSetupDefaults} from '../src/domain/noteSetups';
import {DEFAULT_SETTINGS, GtdParaSettings, resolvePaths} from '../src/domain/settings';
import {parseThreadsSpan} from '../src/domain/threadsSection';
import type {CachedItem} from '../src/storage/dataCache';
import type {ThreadInboxInput} from '../src/storage/threadAggregate';
import {item} from './fixtures';

/** The fixed "now" of the data set: Monday 2026-10-26, noon, local time. */
export const BIG_NOW = new Date(2026, 9, 26, 12, 0, 0);

/** The Thread setups' tags (plus one Loop setup), as Settings → Note setups hold them. */
export const BIG_SETUP_TAGS: ReadonlyArray<{kind: 'thread' | 'loop'; name: string; tag: string}> = [
  {kind: 'thread', name: '1:1', tag: '101'},
  {kind: 'thread', name: 'Retro', tag: 'retro'},
  {kind: 'thread', name: 'Jour fixe', tag: 'jf'},
  {kind: 'thread', name: 'Sparring', tag: 'sparring'},
  {kind: 'loop', name: 'Workshops', tag: 'workshop'},
];

const PATHS = resolvePaths(DEFAULT_SETTINGS);

export interface BigFile {
  kind: 'project' | 'area' | 'inbox';
  name: string;
  /** The item's folder (the Inbox's folder for the Inbox). */
  folder: string;
  /** The data file. */
  path: string;
  content: string;
}

/** Park-Miller: a small seeded generator, enough for test data. */
function rng(seed: number): () => number {
  let a = seed % 2147483647 || 1;
  return () => {
    a = (a * 16807) % 2147483647;
    return (a - 1) / 2147483646;
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The local date `offset` days from BIG_NOW, as YYYY-MM-DD. */
export function bigDay(offset: number): string {
  const d = new Date(BIG_NOW.getFullYear(), BIG_NOW.getMonth(), BIG_NOW.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface MeetingSpec {
  date: string;
  time: string;
  title: string;
  cancelled?: boolean;
}

function meetingLine(m: MeetingSpec): string {
  return `- ${m.cancelled ? '[-] ' : ''}${m.date} ${m.time} ${m.title}`;
}

/** The thread series of Team and its Projects: type, counterpart, display name, how often. */
const SERIES: ReadonlyArray<{type: string; cp: string; title: string; weight: number}> = [
  {type: '101', cp: 'anna', title: '1:1 Anna', weight: 3},
  {type: '101', cp: 'bert', title: '1:1 Bert', weight: 3},
  {type: '101', cp: 'carla', title: '1:1 Carla', weight: 2},
  {type: '101', cp: 'dirk', title: '1:1 Dirk', weight: 2},
  {type: '101', cp: 'eva', title: '1:1 Eva', weight: 2},
  {type: '101', cp: 'frank', title: '1:1 Frank', weight: 2},
  {type: '101', cp: 'greta', title: '1:1 Greta', weight: 2},
  {type: '101', cp: 'hans', title: '1:1 Hans', weight: 2},
  {type: '101', cp: 'ines', title: '1:1 Ines', weight: 1},
  {type: '101', cp: 'jonas', title: '1:1 Jonas', weight: 1},
  {type: '101', cp: 'ulf', title: '1:1 Ulf', weight: 1},
  {type: 'retro', cp: 'alpha', title: 'Retro Alpha sprint', weight: 3},
  {type: 'retro', cp: 'beta', title: 'Retro Beta', weight: 2},
  {type: 'retro', cp: 'gamma', title: 'Retro Gamma with the whole extended platform team and guests', weight: 2},
  {type: 'retro', cp: 'anna', title: 'Retro with Anna', weight: 1},
  {type: 'jf', cp: 'board', title: 'Jour fixe Board: budget, roadmap, staffing and the open risks', weight: 2},
  {type: 'jf', cp: 'works', title: 'Jour fixe works council', weight: 2},
  {type: 'jf', cp: 'it', title: 'JF IT', weight: 2},
  {type: 'sparring', cp: 'jordan', title: 'Sparring Jordan', weight: 2},
  {type: 'sparring', cp: 'sam', title: 'Sparring Sam', weight: 1},
];

const ONE_OFFS = {wf: ['olga', 'paul'], owe: ['quinn', 'rosa'], both: ['stan']};

/** The data set's files, in the order the cache lists them: Projects, Areas, then the Inbox. */
export function bigScopeFiles(): BigFile[] {
  const random = rng(20261026);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const weighted = SERIES.flatMap(s => Array.from({length: s.weight}, () => s));

  // --- meetings: 120 generated across Team (most), Tender and Migration, then the hand-made cases.
  const atruviaMeetings: MeetingSpec[] = [];
  const tenderMeetings: MeetingSpec[] = [];
  const migrationMeetings: MeetingSpec[] = [];
  for (let i = 0; i < 120; i++) {
    const series = pick(weighted);
    const offset = int(-150, 45);
    const hour = int(8, 16);
    const extras: string[] = [];
    if (offset < 0 && random() < 0.25) extras.push('#reviewed');
    if (random() < 0.15) extras.push('#prepped');
    if (series.type === 'retro' && random() < 0.3) extras.push('#retro/' + series.cp + '/2026');
    else extras.push(`#${series.type}/${series.cp}`);
    if (random() < 0.1) extras.push(`#${series.cp}`);
    const spec: MeetingSpec = {
      date: bigDay(offset),
      time: `${pad(hour)}:00-${pad(hour + 1)}:00`,
      title: `${series.title} ${extras.join(' ')}`,
      cancelled: random() < 0.05,
    };
    const where = random();
    (where < 0.66 ? atruviaMeetings : where < 0.83 ? tenderMeetings : migrationMeetings).push(spec);
  }
  // Meetings without a thread, and one of an inactive counterpart that is ahead (back in use).
  atruviaMeetings.push({date: bigDay(-20), time: '12:00-13:00', title: 'Lunch with the department'});
  atruviaMeetings.push({date: bigDay(3), time: '09:00-09:30', title: 'Planning call #workshop/offsite'});
  atruviaMeetings.push({date: bigDay(9), time: '10:00-11:00', title: '1:1 Vera #101/vera'});
  atruviaMeetings.push({date: bigDay(-60), time: '10:00-11:00', title: '1:1 Vera #101/vera'});
  tenderMeetings.push({date: bigDay(-5), time: '14:00-15:00', title: 'Tender kick-off'});
  // §6 scenario 2: the same line in Team and in Zen; one only in Zen.
  const shared: MeetingSpec = {date: bigDay(-40), time: '10:00-12:00', title: 'Strategy offsite #jf/board'};
  atruviaMeetings.push(shared);
  // §6 scenario 3: the same line twice in one file.
  const twice: MeetingSpec = {date: bigDay(-33), time: '15:00-16:00', title: '1:1 Greta #101/greta'};
  atruviaMeetings.push(twice, {...twice});
  // §6 scenario 4: a cancelled meeting named exactly; a renamed one that is cancelled.
  const cancelledExact: MeetingSpec = {date: bigDay(-25), time: '10:00-11:00', title: '1:1 Carla #101/carla', cancelled: true};
  const cancelledRenamed: MeetingSpec = {date: bigDay(-26), time: '10:00-11:00', title: '1:1 Dirk moved online #101/dirk', cancelled: true};
  atruviaMeetings.push(cancelledExact, cancelledRenamed);
  // §6 scenario 5: renamed (same date and thread), and renamed and moved by a day.
  const renamedEva: MeetingSpec = {date: bigDay(-18), time: '11:00-12:00', title: '1:1 Eva - goals #101/eva'};
  const renamedBert: MeetingSpec = {date: bigDay(-11), time: '11:00-12:00', title: '1:1 Bert (short) #101/bert'};
  const movedFrank: MeetingSpec = {date: bigDay(-15), time: '11:00-12:00', title: '1:1 Frank #101/frank'};
  atruviaMeetings.push(renamedEva, renamedBert);
  migrationMeetings.push(movedFrank);

  const zenOnly: MeetingSpec = {date: bigDay(-38), time: '09:00-10:00', title: 'Zen planning #jf/board'};
  const zenMeetings: MeetingSpec[] = [
    {...shared},
    zenOnly,
    {date: bigDay(-14), time: '07:00-08:00', title: 'Sitting group #sangha/morning'},
    {date: bigDay(7), time: '07:00-08:00', title: 'Sitting group #sangha/morning'},
    {date: bigDay(-3), time: '18:00-19:00', title: '1:1 Anna #101/anna'},
  ];
  const soloMeetings: MeetingSpec[] = [
    {date: bigDay(-9), time: '16:00-17:00', title: 'Retro Omega #retro/omega'},
    {date: bigDay(5), time: '16:00-17:00', title: 'Retro Omega #retro/omega'},
  ];
  const inboxMeetings: MeetingSpec[] = [
    {date: bigDay(-2), time: '13:00-13:30', title: 'Call with Anna #101/anna'},
    {date: bigDay(-6), time: '17:00-17:30', title: 'Coffee with Sam'},
    {date: bigDay(4), time: '08:00-08:30', title: 'Dentist'},
  ];

  const keyOf = (m: MeetingSpec) => meetingKey({date: m.date, title: m.title});
  const scopeMeetings = [...atruviaMeetings, ...tenderMeetings, ...migrationMeetings];
  const usable = scopeMeetings.filter(m => !m.cancelled);
  const threadOfTitle = (title: string) => /#((?:101|retro|jf|sparring)\/[a-z]+)/.exec(title)?.[1] ?? null;
  const leafOf = (tag: string) => tag.split('/')[1];

  // --- todos: 84 generated (half agreed in a meeting), then the hand-made cases.
  const todo = (text: string, fields: Record<string, string | null>, state: ' ' | 'x' | '-' = ' ') => {
    const tail = Object.entries(fields)
      .filter(([, v]) => v)
      .map(([k, v]) => ` [${k}:: ${v}]`)
      .join('');
    return `- [${state}] ${text}${tail}`;
  };
  const cps = [...new Set(SERIES.map(s => s.cp))];
  const verbs = ['Send', 'Check', 'Draft', 'Review', 'Book', 'Ask about', 'Prepare', 'Follow up on', 'Clarify', 'Order'];
  const nouns = ['the budget', 'the slides', 'the contract', 'the roadmap', 'the offer', 'the minutes', 'the hiring plan', 'the risks'];
  const genTodo = (i: number): string => {
    const agreedIn = i % 2 === 0 ? (random() < 0.85 ? pick(usable) : pick(scopeMeetings)) : null;
    const thread = agreedIn ? threadOfTitle(agreedIn.title) : null;
    const cp = thread ? leafOf(thread) : pick(cps);
    const roll = random();
    let tags = '';
    if (roll < 0.15) tags = ` #wf/${cp}`;
    else if (roll < 0.25) tags = agreedIn ? ' #wf' : ` #wf/${cp}`;
    else if (roll < 0.4) tags = ` #owe/${cp}`;
    else if (roll < 0.55) tags = thread ? ` #${thread}` : ` #101/${cp}`;
    else if (roll < 0.62) tags = ` #${cp}`;
    else if (roll < 0.67) tags = ` #someday #retro/${pick(['alpha', 'beta'])}`;
    const doneRoll = random();
    const state = doneRoll < 0.2 ? 'x' : doneRoll < 0.24 ? '-' : ' ';
    const created = random() < 0.7 ? bigDay(int(-160, -1)) : null;
    const completion = state === 'x' && random() < 0.8 ? bigDay(int(-60, 0)) : null;
    return todo(`${pick(verbs)} ${pick(nouns)} ${i + 1}${tags}`, {meeting: agreedIn ? keyOf(agreedIn) : null, created, completion}, state);
  };
  const atruviaTodos: string[] = [];
  const tenderTodos: string[] = [];
  const migrationTodos: string[] = [];
  for (let i = 0; i < 84; i++) {
    const line = genTodo(i);
    const where = random();
    (where < 0.55 ? atruviaTodos : where < 0.78 ? tenderTodos : migrationTodos).push(line);
  }
  for (const cp of ONE_OFFS.wf) atruviaTodos.push(todo(`Answer from ${cp} #wf/${cp}`, {created: bigDay(-12)}));
  for (const cp of ONE_OFFS.owe) tenderTodos.push(todo(`Promise to ${cp} #owe/${cp}`, {}));
  for (const cp of ONE_OFFS.both) migrationTodos.push(todo(`Deal with ${cp} #wf/${cp} #owe/${cp}`, {created: bigDay(-30)}));
  // Hand-made cases (§6 scenarios 2-5).
  atruviaTodos.push(
    todo('Offsite notes out #owe/board', {meeting: keyOf(shared)}),
    todo('Zen planning follow-up', {meeting: keyOf(zenOnly)}),
    todo('Greta: send the reference letter', {meeting: keyOf(twice), created: bigDay(-33)}),
    todo('Carla: the cancelled one still counts', {meeting: keyOf(cancelledExact)}),
    todo('Dirk: renamed and cancelled', {meeting: `${cancelledRenamed.date} 1:1 Dirk 101/dirk`}),
  );
  tenderTodos.push(
    todo('Eva: goals draft', {meeting: `${renamedEva.date} 1:1 Eva 101/eva`, created: renamedEva.date}),
    todo('Bert: hand over the files #wf', {meeting: `${renamedBert.date} 1:1 Bert 101/bert`}),
    todo('Frank: the moved meeting', {meeting: `${bigDay(-16)} 1:1 Frank 101/frank`}),
  );

  // --- agreements: 14, most made in a meeting.
  const agreement = (text: string, fields: Record<string, string | null>) =>
    `- ${text}${Object.entries(fields)
      .filter(([, v]) => v)
      .map(([k, v]) => ` [${k}:: ${v}]`)
      .join('')}`;
  const atruviaAgreements: string[] = [];
  const tenderAgreements: string[] = [];
  for (let i = 0; i < 12; i++) {
    const made = pick(usable);
    const thread = threadOfTitle(made.title);
    const ended = random() < 0.3 ? bigDay(int(-30, -1)) : null;
    const valid = random() < 0.4 ? bigDay(int(-10, 60)) : null;
    const line = agreement(`Rule ${i + 1}${thread ? ` #${thread}` : ''}`, {meeting: keyOf(made), created: made.date, valid, ended});
    (i % 3 === 2 ? tenderAgreements : atruviaAgreements).push(line);
  }
  atruviaAgreements.push(
    agreement('Board decides by mail #jf/board', {meeting: keyOf(shared), created: shared.date}),
    agreement('Eva sets her own goals #101/eva', {meeting: `${renamedEva.date} 1:1 Eva 101/eva`}),
  );

  // --- Inbox: todos agreed in Team's and the Inbox's meetings, and plain ones.
  const inboxTodos = [
    todo('Anna asked for the deck', {meeting: keyOf(inboxMeetings[0])}),
    todo('Filed later: board question', {meeting: keyOf(usable[3])}),
    todo('Inbox only #wf/ivan', {}),
    todo('#101/anna from the inbox', {}),
    todo('Buy stamps', {}),
  ];

  const threadLines = [
    ...['anna', 'bert', 'carla', 'dirk', 'eva', 'frank', 'greta', 'hans', 'ines', 'alpha', 'beta', 'gamma', 'board', 'works', 'it', 'jordan', 'sam'].map(
      cp => `- ${cp}: active`,
    ),
    '- ulf: inactive',
    '- vera: inactive',
    '- gone: inactive',
  ];

  const front = (kind: string, extra: string[] = []) => ['---', `kind: ${kind}`, 'status: active', ...extra, '---', ''];
  const sections = (parts: Record<string, string[]>) => Object.entries(parts).flatMap(([h, lines]) => [`## ${h}`, '', ...lines, '']);
  const file = (kind: BigFile['kind'], name: string, folder: string, fileName: string, extra: string[], parts: Record<string, string[]>): BigFile => ({
    kind,
    name,
    folder,
    path: `${folder}/${fileName}`,
    content: [...front(kind, extra), ...sections(parts)].join('\n'),
  });
  const project = (name: string, extra: string[], parts: Record<string, string[]>) =>
    file('project', name, `${PATHS.projects}/${name}`, 'project.txt', extra, parts);
  const area = (name: string, extra: string[], parts: Record<string, string[]>) => file('area', name, `${PATHS.areas}/${name}`, 'area.txt', extra, parts);

  return [
    project('Tender', ['area: Team', 'abbrev: TD'], {
      Tasks: tenderTodos,
      Meetings: tenderMeetings.map(meetingLine),
      Agreements: tenderAgreements,
      // A status line in a member Project: the owner's line wins.
      Threads: ['- hans: inactive'],
    }),
    project('Migration', ['area: Team', 'abbrev: MG'], {Tasks: migrationTodos, Meetings: migrationMeetings.map(meetingLine)}),
    project('Solo', ['abbrev: SO'], {Tasks: [todo('Omega action items #retro/omega', {meeting: keyOf(soloMeetings[0])})], Meetings: soloMeetings.map(meetingLine)}),
    area('Team', ['abbrev: AT'], {
      Tasks: atruviaTodos,
      Meetings: atruviaMeetings.map(meetingLine),
      Agreements: atruviaAgreements,
      Threads: threadLines,
      Loops: [`- workshop/offsite: active, ${bigDay(30)}`],
    }),
    area('Zen', ['abbrev: ZE'], {
      Tasks: [todo('Read the sutra #sangha/morning', {meeting: keyOf(zenMeetings[2])}), todo('Offsite in Zen too', {meeting: keyOf(shared)})],
      Meetings: zenMeetings.map(meetingLine),
      Threads: ['- morning: active'],
    }),
    file('inbox', 'Inbox', PATHS.inboxFolder, 'Inbox.txt', [], {Tasks: inboxTodos, Meetings: inboxMeetings.map(meetingLine)}),
  ];
}

/**
 * A file as the cache holds it: the parsed parts the thread views read, through the
 * same domain parsers storage/projectFile.ts's `parseProjectFileContent` uses
 * (which cannot be imported here: storage/projectFile.ts pulls in the SDK).
 */
function cachedItemOf(f: BigFile): CachedItem {
  const fm = parseFrontMatter(f.content);
  const tasks = parseTasksSpan(f.content);
  const meetings = parseMeetingsSpan(f.content);
  const threads = parseThreadsSpan(f.content);
  const loops = parseLoopsSpan(f.content);
  const agreements = parseAgreementsSpan(f.content);
  return {
    ...item(f.kind as 'project' | 'area', f.name),
    path: f.folder,
    rawContent: f.content,
    tasks: tasks.tasks,
    taskExtraLines: tasks.extraLines,
    meetings: meetings.meetings,
    meetingExtraLines: meetings.extraLines,
    threads: threads.threads,
    threadsExtraLines: threads.extraLines,
    loops: loops.loops,
    loopsExtraLines: loops.extraLines,
    agreements: agreements.agreements,
    agreementsExtraLines: agreements.extraLines,
    status: fm.status,
    area: fm.area,
    abbrev: fm.abbrev,
  };
}

/** The data set as the cache holds it: the Projects and Areas, the Inbox's lists, and Team (the scope's owner). */
export function bigScopeCache(): {items: CachedItem[]; inbox: ThreadInboxInput; team: CachedItem} {
  const files = bigScopeFiles();
  const items = files.filter(f => f.kind !== 'inbox').map(cachedItemOf);
  const inboxFile = files.find(f => f.kind === 'inbox')!;
  const inbox = {path: inboxFile.folder, tasks: parseTasksSpan(inboxFile.content).tasks, meetings: parseMeetingsSpan(inboxFile.content).meetings};
  return {items, inbox, team: items.find(i => i.name === 'Team')!};
}

/** The settings for the data set: its Thread and Loop setups, the seeded Default, everything else default. */
export function bigScopeSettings(): Partial<GtdParaSettings> {
  const noteSetups = BIG_SETUP_TAGS.map((s, i) => ({...createNoteSetup(`b${i}`, s.kind), name: s.name, tags: [s.tag]}));
  return {noteSetups, noteSetupDefaults: seedNoteSetupDefaults(), nextNoteSetupId: noteSetups.length + 1, noteSetupsMigrated: true};
}

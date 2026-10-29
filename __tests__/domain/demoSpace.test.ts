import {buildDemoFiles, demoProfileSettings, DEMO_BASE_ROOT} from '../../src/domain/demoSpace';
import {
  parseFrontMatter,
  parseMeetingsSpan,
  parseScopeSpan,
  parseTasksSpan,
} from '../../src/domain/markdown';
import {profileSettingsOf, sanitizeProfileSettings} from '../../src/domain/profiles';

const today = new Date(2026, 9, 1); // Thu 2026-10-01

describe('demo space', () => {
  const files = buildDemoFiles(today);
  const byPath = (p: string) => files.find(f => f.path === p)!.content;

  it('has projects, areas, inbox and the folders', () => {
    const paths = files.map(f => f.path);
    expect(paths.filter(p => p.startsWith('1 Projects/')).length).toBe(5);
    expect(paths.filter(p => p.startsWith('2 Areas/') && p.endsWith('/area.txt')).length).toBe(5);
    expect(paths).toContain('2 Areas/0 Inbox/Inbox.txt');
    expect(paths).not.toContain('Inbox.txt');
    expect(paths).toContain('3 Resources/README.txt');
  });

  it('parses cleanly with the real project-file parser', () => {
    for (const f of files.filter(x => x.path.endsWith('.txt') && !x.path.includes('README'))) {
      expect(parseTasksSpan(f.content).extraLines).toEqual([]);
      expect(parseMeetingsSpan(f.content).extraLines).toEqual([]);
    }
    const garden = byPath('1 Projects/Garden renovation/project.txt');
    const fm = parseFrontMatter(garden);
    expect(fm).toMatchObject({status: 'active', dailyFocus: false, weeklyFocus: false, monthlyFocus: false, area: 'Home', abbrev: 'GR'});
    expect(files.some(f => /## (Weekly|Monthly) Goals/.test(f.content))).toBe(false);
    const tasks = parseTasksSpan(garden).tasks;
    expect(tasks).toHaveLength(5);
    expect(tasks.find(t => t.text.startsWith('Order soil'))!.dueDate).toBe('2026-10-03');
    expect(tasks.find(t => t.text.startsWith('Get a quote'))!.waitingOn).toBe('marco');
    expect(parseScopeSpan(garden)).toContain('vegetable');
    const offsite = byPath('1 Projects/Team offsite/project.txt');
    const meetings = parseMeetingsSpan(offsite).meetings;
    expect(meetings.map(m => m.date)).toEqual(['2026-09-30', '2026-10-02', '2026-10-21']);
    expect(meetings[2].days).toBe(2);
    expect(parseFrontMatter(byPath('1 Projects/Bike repair/project.txt')).status).toBe('on-hold');
    const team = parseMeetingsSpan(byPath('2 Areas/Team/area.txt')).meetings;
    expect(team.filter(m => m.title.startsWith('Team sync')).map(m => m.date)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ]);
  });

  it('writes todos in the current syntax: [due:: …] fields and #wf/<name>', () => {
    const all = files.map(f => f.content).join('\n');
    expect(all).not.toMatch(/#due:|#waiting-for/);
    const garden = parseTasksSpan(byPath('1 Projects/Garden renovation/project.txt')).tasks;
    expect(garden.find(t => t.text.startsWith('Order soil'))!.fields.due).toBe('2026-10-03');
    expect(garden.find(t => t.text.startsWith('Get a quote'))!.text).toBe('Get a quote from the landscaper #wf/marco');
  });

  it('has a sparring thread with agreements and a loop with a meeting today (docs/dev/history/technical-design-engage-in-context.md §5)', () => {
    const coaching = byPath('2 Areas/Coaching/area.txt');
    const tasks = parseTasksSpan(coaching).tasks;
    const meetings = parseMeetingsSpan(coaching).meetings;
    expect(tasks.filter(t => t.fields.meeting === '2026-09-24 Sparring Jordan sparring/jordan').map(t => t.text)).toEqual([
      'Send Jordan the role canvas #next',
      'Draft feedback for the team lead',
      'Org chart from Jordan #wf',
    ]);
    expect(meetings.find(m => m.title.startsWith('Offsite planning'))!.date).toBe('2026-10-01');
    expect(coaching).toContain('- jordan: active');
    expect(coaching).toContain('- workshop/offsite: active, 2026-10-15');
  });

  it('has Area Sport whose loop note is its home notebook, with a past coach call to follow up (docs/dev/history/technical-design-engage-page-owner.md §6)', () => {
    const sport = byPath('2 Areas/Sport/area.txt');
    expect(parseMeetingsSpan(sport).meetings.map(m => [m.date, m.title])).toEqual([['2026-09-30', 'Coach call'], ['2026-10-14', 'Coach call']]);
    expect(parseTasksSpan(sport).tasks.map(t => t.text)).toContain('Plan long runs #race/marathon #next');
    expect(sport).toContain('- race/marathon: active, 2026-10-31');
  });

  it('profile settings point at the demo folders and survive the profile file filter', () => {
    const s = demoProfileSettings();
    expect(s.baseRoot).toBe(DEMO_BASE_ROOT);
    expect(s.noteSetups.map(x => x.tags)).toEqual([['1on1'], ['sparring'], ['workshop'], ['race']]);
    expect(s.noteSetupsMigrated).toBe(true);
    // One file per Project/Area and year: the Default, the thread setups and Races share the home notebook; a Workshops loop has its loop note.
    expect(s.noteSetupDefaults.notebook).toEqual({name: '{name} {year}', folder: ''});
    expect(s.noteSetups.map(x => x.notebook)).toEqual([{name: '{name} {year}', folder: ''}, {name: '{name} {year}', folder: ''}, {name: '{year}-{month} {tag} {subtag}', folder: ''}, {name: '{name} {year}', folder: ''}]);
    expect(sanitizeProfileSettings(profileSettingsOf(s))).toEqual(profileSettingsOf(s));
  });
});

describe('demo space: contexts and focus blocks (docs/dev/history/technical-design-time-and-place.md §3.8)', () => {
  const files = buildDemoFiles(today);
  it('has three focus blocks: a project\'s, a loop\'s and a thread\'s', () => {
    const blocks = files.flatMap(f => parseMeetingsSpan(f.content).meetings).filter(m => m.tags.includes('focusblock'));
    expect(blocks.map(m => m.tags.filter(t => t !== 'focusblock'))).toEqual([[], ['workshop/offsite'], ['sparring/jordan']]);
  });
  it('the demo profile has the contexts Work and Home, with Everything active', () => {
    const settings = demoProfileSettings();
    expect(settings.contexts.map(c => c.name)).toEqual(['Work', 'Home']);
    expect(settings.activeContextId).toBe('');
    expect(sanitizeProfileSettings(profileSettingsOf(settings)).contexts).toEqual(settings.contexts);
  });
});

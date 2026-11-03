import AsyncStorage from '@react-native-async-storage/async-storage';
import {device} from '../../test-helpers/fakeDevice/device';
import {firstCheckboxOf, openApp, tap, tapTab, texts, textsBetween, type} from '../../test-helpers/scenario/app';
import {fileText, loggedErrors, PATHS, projectFile, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';

// Rollback round-trips (docs/dev/history/technical-design-time-and-place.md §3.7, §6, §7): files written by 0.22
// keep everything 0.21.1 reads - focus flags, goal spans, `#now` - and the update itself writes nothing.
const DESIGN = 'technical-design-time-and-place.md';
const SETTINGS_KEY = 'gtdpara:settings:v1';

afterEach(() => jest.useRealTimers());

const FOCUS_LINES = ['dailyFocus: true', 'weeklyFocus: true', 'monthlyFocus: true'];
const GOALS = ['## Weekly Goals', '- 2026-W42: Ship the homepage', '', '## Monthly Goals', '- 2026-10: Relaunch', ''];

/** A 0.21-written project.txt: all three focus flags, a `#now` todo, a meeting, both goal spans. */
function website(): string {
  return [
    '---',
    'kind: project',
    'status: active',
    ...FOCUS_LINES,
    'abbrev: WEB',
    '---',
    '',
    '## Scope',
    'The new website.',
    '',
    '## Tasks',
    '- [ ] Write copy #now',
    '- [ ] Draft homepage #next',
    '',
    '## Meetings',
    '- 2026-10-15 10:00 Review layout',
    '',
    ...GOALS,
  ].join('\n');
}

const frontMatter = (text: string) => text.slice(0, text.indexOf('\n---', 3) + 4).split('\n');
const goalSpans = (text: string) => text.slice(text.indexOf('## Weekly Goals'));

scenario('Focus flags, goal spans and #now survive a todo, a meeting and a status change', {feature: 'Projects and Areas', design: DESIGN}, () => {
  given('Website as 0.21 wrote it: all three focus flags, goals, "Write copy #now"', () => {
    smokeClock();
    putFile(projectFile('Website'), website());
  });
  when('I open Website and tick "Write copy"', async () => {
    await openApp();
    await tapTab('Projects');
    await tap('#WEB');
    await tap('☐', firstCheckboxOf(texts().find(t => t.startsWith('Write copy')) ?? 'Write copy'));
  });
  then('only its checkbox and completion field changed; #now stays in the text', () => {
    expect(fileText(projectFile('Website'))).toContain('- [x] Write copy #now [completion:: 2026-10-14]');
    expect(frontMatter(fileText(projectFile('Website')))).toEqual(frontMatter(website()));
    expect(goalSpans(fileText(projectFile('Website')))).toBe(goalSpans(website()));
  });
  when('I add the meeting "Kick-off" on 2026-10-20', async () => {
    await tap('Meeting');
    await type('New meeting title', 'Kick-off');
    await type('YYYY-MM-DD', '2026-10-20');
    await tap('+ Add');
  });
  then('the frontmatter and the goal spans are byte for byte as before', () => {
    expect(fileText(projectFile('Website'))).toContain('- 2026-10-20 1d Kick-off');
    expect(frontMatter(fileText(projectFile('Website')))).toEqual(frontMatter(website()));
    expect(goalSpans(fileText(projectFile('Website')))).toBe(goalSpans(website()));
  });
  when('I set it On Hold', () => tap('On Hold'));
  then('the status line changed and the focus lines are still there, in place', () => {
    const fm = frontMatter(fileText(projectFile('Website')));
    expect(fm.slice(0, 6)).toEqual(['---', 'kind: project', 'status: on-hold', ...FOCUS_LINES]);
    expect(goalSpans(fileText(projectFile('Website')))).toBe(goalSpans(website()));
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Upgrade: 0.22 starts on a 0.21 space without writing a file or a setting', {feature: 'Daily', design: DESIGN}, () => {
  given('a 0.21 space: Website with focus flags, goals and #now, Garage in no focus with a #next todo; focus mode on', async () => {
    smokeClock();
    putFile(projectFile('Website'), website());
    putFile(projectFile('Garage'), ['---', 'kind: project', 'status: active', 'abbrev: GAR', '---', '', '## Tasks', '- [ ] Sort tools #next', ''].join('\n'));
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({...DEFAULT_SETTINGS, lastSeenVersion: '0.21.1', dailyFocusProjectCount: 4, weeklyFocusAreaCount: 1, focusModeActive: true}),
    );
  });
  let before: Record<string, string> = {};
  when('0.22 starts', async () => {
    before = device().fs.tree(PATHS.projects);
    await openApp();
  });
  then('Daily shows every next todo - Garage\'s too - and "Write copy #now" as "Write copy #next"', async () => {
    await tapTab('Daily');
    expect(textsBetween('Next todos')).toEqual(expect.arrayContaining(['Sort tools  #next', 'Write copy  #next', 'Draft homepage  #next']));
  });
  and('no file changed', () => {
    expect(device().fs.tree(PATHS.projects)).toEqual(before);
    expect(fileText(projectFile('Website'))).toBe(website());
  });
  and('the stored settings still hold the focus keys', async () => {
    const stored = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}');
    expect(stored).toEqual(expect.objectContaining({dailyFocusProjectCount: 4, weeklyFocusAreaCount: 1, focusModeActive: true}));
  });
});

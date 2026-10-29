/**
 * Rollback shims (docs/dev/history/technical-design-time-and-place.md §3.7, §6): what 0.22 keeps so 0.21.1 can be
 * installed over it - the retired settings in settings and profile files, a stored Home page layout with a `goals`
 * piece, the focus flags in frontmatter, and `#now` read as `#next` without touching the text.
 */
import {deriveFlowState} from '../../src/domain/flowState';
import {deriveTaskFields, parseFrontMatter, serializeTaskLine, writeFrontMatterIntoContent} from '../../src/domain/markdown';
import {DEFAULT_PIECE_TYPES, PageLayout, PIECE_PAGES, renderPieceText} from '../../src/domain/pageLayout';
import {buildActiveSettings, parseProfile, PROFILE_KEYS, sanitizeProfileSettings, serializeProfile} from '../../src/domain/profiles';
import {DEFAULT_SETTINGS, GtdParaSettings} from '../../src/domain/settings';
import {newTask, withTaskDone} from '../../src/domain/taskEdit';

const RETIRED = {
  dailyFocusProjectCount: 4,
  dailyFocusAreaCount: 1,
  weeklyFocusProjectCount: 6,
  weeklyFocusAreaCount: 2,
  monthlyFocusProjectCount: 1,
  monthlyFocusAreaCount: 5,
  focusModeActive: true,
};

describe('retired settings', () => {
  it('stay in DEFAULT_SETTINGS and are kept per profile', () => {
    for (const key of Object.keys(RETIRED)) {
      expect(key in DEFAULT_SETTINGS).toBe(true);
      expect(PROFILE_KEYS).toContain(key);
    }
  });

  it('survive a profile save, load and switch with their values', () => {
    const settings: GtdParaSettings = {...DEFAULT_SETTINGS, ...RETIRED};
    const parsed = parseProfile(serializeProfile('Production', settings, new Date('2026-10-14T10:00:00Z'), '0.22.0'), 'Production');
    expect(parsed.settings).toEqual(expect.objectContaining(RETIRED));
    expect(buildActiveSettings('production', parsed.settings, {}, DEFAULT_SETTINGS)).toEqual(expect.objectContaining(RETIRED));
  });
});

describe('a stored Home page layout with a goals piece', () => {
  const home: PageLayout = {
    pieces: [
      {type: 'title', x: 100, y: 100},
      {type: 'goals', x: 100, y: 200},
    ],
    texts: [],
  } as unknown as PageLayout;

  it('loads and saves unchanged', () => {
    const settings = {...DEFAULT_SETTINGS, noteSetupDefaults: {...DEFAULT_SETTINGS.noteSetupDefaults, home}} as GtdParaSettings;
    const parsed = parseProfile(serializeProfile('P', settings, new Date(0), '0.22.0'), 'P');
    expect(sanitizeProfileSettings(parsed.settings).noteSetupDefaults).toEqual(settings.noteSetupDefaults);
  });

  it('is no longer offered for new Home pages', () => {
    expect(DEFAULT_PIECE_TYPES.home).not.toContain('goals');
    expect(PIECE_PAGES.goals).toEqual([]);
  });

  it('renders the goals piece as nothing', () => {
    expect(renderPieceText({type: 'goals', x: 0, y: 0} as never, {title: 'Website'})).toBe('');
  });
});

describe('focus flags in frontmatter', () => {
  const content = ['---', 'kind: project', 'status: active', 'dailyFocus: true', 'weeklyFocus: true', 'monthlyFocus: true', 'abbrev: WEB', '---', ''].join('\n');

  it('are written back byte for byte when another field changes', () => {
    const fm = parseFrontMatter(content);
    expect(writeFrontMatterIntoContent(content, fm)).toBe(content);
    expect(writeFrontMatterIntoContent(content, {...fm, area: 'Garden'})).toBe(content.replace('abbrev: WEB', 'area: Garden\nabbrev: WEB'));
  });
});

describe('#now', () => {
  it('reads as #next when no other flow state is set', () => {
    expect(deriveFlowState(['now'])).toBe('next');
    expect(deriveTaskFields('Write copy #now').flowState).toBe('next');
    expect(deriveFlowState(['now', 'someday'])).toBe('someday');
  });

  it('stays in the text when the todo is ticked', () => {
    const task = newTask({text: 'Write copy #now'});
    expect(serializeTaskLine(withTaskDone(task, true, '2026-10-14'))).toBe('- [x] Write copy #now [completion:: 2026-10-14]');
  });
});

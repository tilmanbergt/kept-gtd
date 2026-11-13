// domain/pageShow.ts and the `show:` frontmatter line (docs/dev/history/technical-design-calmer-screens.md §3.8).
import {
  parseFrontMatter,
  writeFrontMatterIntoContent,
} from '../../src/domain/markdown';
import {
  DEFAULT_PAGE_SHOW,
  hiddenHint,
  leftTabs,
  openRule,
  parsePageShow,
  presenceOf,
  serializePageShow,
  showValue,
  startTab,
  visibleParts,
  withOpenRule,
  withShowValue,
} from '../../src/domain/pageShow';

const FILE =
  '---\nkind: project\nstatus: active\nabbrev: GR\n---\n\n## Tasks\n- [ ] Order soil\n';

describe('pageShow', () => {
  it('reads parts, values and the open rule; a missing token or a typo reads as the default', () => {
    const show = parsePageShow(
      'loops=always schedule=never open=notebook threads=nevr foo=bar',
    );
    expect(showValue(show, 'loops')).toBe('always');
    expect(showValue(show, 'schedule')).toBe('never');
    expect(showValue(show, 'threads')).toBe('auto');
    expect(showValue(show, 'agreements')).toBe('auto');
    expect(openRule(show)).toBe('notebook');
    expect(openRule(DEFAULT_PAGE_SHOW)).toBe('first');
  });
  it('writes back what it read, unknown tokens and typos as written', () => {
    expect(serializePageShow(parsePageShow('loops=nevr foo=bar  odd'))).toBe(
      'loops=nevr foo=bar odd',
    );
  });
  it('a choice replaces its token in place; the default removes it; nothing left: no line', () => {
    let show = parsePageShow('loops=nevr foo=bar');
    show = withShowValue(show, 'loops', 'never');
    expect(serializePageShow(show)).toBe('loops=never foo=bar');
    show = withShowValue(show, 'schedule', 'always');
    expect(serializePageShow(show)).toBe('loops=never foo=bar schedule=always');
    show = withOpenRule(show, 'files');
    expect(serializePageShow(show)).toBe(
      'loops=never foo=bar schedule=always open=files',
    );
    show = withShowValue(
      withShowValue(withOpenRule(show, 'first'), 'loops', 'auto'),
      'schedule',
      'auto',
    );
    expect(serializePageShow(show)).toBe('foo=bar');
    expect(
      serializePageShow(withShowValue(DEFAULT_PAGE_SHOW, 'loops', 'auto')),
    ).toBeNull();
  });
  it('visibleParts: auto follows what there is, always and never win', () => {
    const presence = {
      threads: true,
      loops: false,
      agreements: false,
      schedule: true,
      notebook: true,
      projects: false,
    };
    const show = parsePageShow('loops=always schedule=never');
    expect(visibleParts(show, presence)).toEqual({
      threads: true,
      loops: true,
      agreements: false,
      schedule: false,
      notebook: true,
      projects: false,
    });
  });
});

describe('the show: line in the frontmatter', () => {
  it('a file without the line reads all defaults and is written without one', () => {
    const fm = parseFrontMatter(FILE);
    expect(fm.show).toEqual(DEFAULT_PAGE_SHOW);
    expect(writeFrontMatterIntoContent(FILE, fm)).toBe(FILE);
  });
  it('a changed part adds the line; back to the default removes it again', () => {
    const fm = parseFrontMatter(FILE);
    const withLoops = writeFrontMatterIntoContent(FILE, {
      ...fm,
      show: withShowValue(fm.show, 'loops', 'always'),
    });
    expect(withLoops).toContain('\nshow: loops=always\n');
    const back = parseFrontMatter(withLoops);
    expect(
      writeFrontMatterIntoContent(withLoops, {
        ...back,
        show: withShowValue(back.show, 'loops', 'auto'),
      }),
    ).toBe(FILE);
  });
  it("round trip: a hand-written line with a typo and an unknown part survives another field's change", () => {
    const file = FILE.replace(
      'abbrev: GR\n',
      'abbrev: GR\nshow: loops=nevr foo=bar\n',
    );
    const fm = parseFrontMatter(file);
    const written = writeFrontMatterIntoContent(file, {
      ...fm,
      status: 'on-hold',
    });
    expect(written).toContain('\nshow: loops=nevr foo=bar\n');
    expect(written).toContain('status: on-hold');
    expect(parseFrontMatter(written).show).toEqual(fm.show);
  });
});

describe('hiddenHint and presenceOf', () => {
  it('names what a part set to Never hides, and only then', () => {
    const show = parsePageShow('loops=never threads=always');
    expect(hiddenHint(show, 'loops', 2)).toBe('Never · 2 loops');
    expect(hiddenHint(show, 'loops', 1)).toBe('Never · 1 loop');
    expect(hiddenHint(show, 'loops', 0)).toBeNull();
    expect(hiddenHint(show, 'threads', 3)).toBeNull();
    expect(
      presenceOf({
        threads: 1,
        loops: 0,
        agreements: 0,
        schedule: 2,
        notebook: 0,
        projects: 0,
      }),
    ).toEqual({
      threads: true,
      loops: false,
      agreements: false,
      schedule: true,
      notebook: false,
      projects: false,
    });
  });
});

describe('leftTabs and startTab', () => {
  const none = {
    threads: 0,
    loops: 0,
    agreements: 0,
    schedule: 0,
    notebook: 0,
    projects: 0,
  };
  it('shows the parts with content and Files; opens on the first with content', () => {
    const presence = presenceOf({...none, notebook: 1});
    const tabs = leftTabs(
      'project',
      visibleParts(DEFAULT_PAGE_SHOW, presence),
      true,
    );
    expect(tabs).toEqual(['notebook', 'files']);
    expect(startTab('first', tabs, 'project', presence)).toBe('notebook');
  });
  it('Always shows an empty part but does not open on it; Never hides one with content', () => {
    const presence = presenceOf({...none, threads: 2});
    const show = withShowValue(
      withShowValue(DEFAULT_PAGE_SHOW, 'loops', 'always'),
      'threads',
      'never',
    );
    const tabs = leftTabs('project', visibleParts(show, presence), true);
    expect(tabs).toEqual(['loops', 'files']);
    expect(startTab('first', tabs, 'project', presence)).toBe('files');
  });
  it('the open rule wins when its tab shows, and falls back when it does not', () => {
    const presence = presenceOf({...none, threads: 1, notebook: 1});
    const tabs = leftTabs(
      'area',
      visibleParts(DEFAULT_PAGE_SHOW, presence),
      true,
    );
    expect(tabs).toEqual(['threads', 'notebook', 'files']);
    expect(startTab('notebook', tabs, 'area', presence)).toBe('notebook');
    expect(startTab('files', tabs, 'area', presence)).toBe('files');
    expect(startTab('notebook', ['threads', 'files'], 'area', presence)).toBe(
      'threads',
    );
  });
  it("an area's Projects tab shows for its projects or its loops; no notebook setup, no Notebook tab", () => {
    const presence = presenceOf({...none, projects: 2, notebook: 1});
    expect(
      leftTabs('area', visibleParts(DEFAULT_PAGE_SHOW, presence), false),
    ).toEqual(['loops', 'files']);
  });
});

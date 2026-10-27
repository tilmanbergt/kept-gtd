// Pure parts of the feature areas (scripts/test-areas.json): glob matching, assigning test and
// source files to areas, the help-page check and the coverage matrix. No I/O here, so
// scripts/test-test-areas.mjs can test them. Design: docs/dev/history/technical-design-test-tiers.md §3.1, §3.5.

/** Help pages that explain the app as a whole rather than one area. */
export const GENERAL_HELP_PAGES = ['index.md', 'philosophy.md', 'getting-started.md', 'troubleshooting.md'];

/** Folders whose files no area has to claim (generated at build time). */
export const UNASSIGNED_OK = ['src/generated/'];

/**
 * A glob as a regular expression over `/`-separated paths: `**` any number of folders, `*` any
 * characters within one path part, `?` one character, `{a,b}` alternatives (not nested).
 */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      // `**/` matches zero or more folders; a trailing `**` matches the rest of the path.
      if (glob[i + 2] === '/') {
        re += '(?:[^/]+/)*';
        i += 2;
      } else {
        re += '.*';
        i += 1;
      }
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end < 0) throw new Error(`unclosed { in glob ${glob}`);
      const options = glob.slice(i + 1, end).split(',');
      re += `(?:${options.map(o => globToRegExp(o).source.slice(1, -1)).join('|')})`;
      i = end;
    } else {
      re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

const compiled = new WeakMap();
function matchers(area) {
  let m = compiled.get(area);
  if (!m) {
    m = [...(area.tests ?? []), ...(area.sources ?? [])].map(globToRegExp);
    compiled.set(area, m);
  }
  return m;
}

/** The id of the first area (in file order) one of whose globs matches `path`, or null. */
export function areaOf(path, areas) {
  for (const area of areas) if (matchers(area).some(re => re.test(path))) return area.id;
  return null;
}

/**
 * Assigns each path to the first area that matches it. Paths under UNASSIGNED_OK are left out.
 * Returns {byArea: {id: [paths]}, unassigned: [paths]}; every area appears in byArea.
 */
export function assign(paths, areas) {
  const byArea = Object.fromEntries(areas.map(a => [a.id, []]));
  const unassigned = [];
  for (const path of paths) {
    if (UNASSIGNED_OK.some(prefix => path.startsWith(prefix))) continue;
    const id = areaOf(path, areas);
    if (id) byArea[id].push(path);
    else unassigned.push(path);
  }
  return {byArea, unassigned};
}

/** Help pages (file names in docs/user/) that no area names and that are not general pages. */
export function helpPagesWithoutArea(pages, areas) {
  const named = new Set(areas.flatMap(a => a.help ?? []));
  return pages.filter(p => !GENERAL_HELP_PAGES.includes(p) && !named.has(p));
}

/** Help pages areas name that do not exist. */
export function missingHelpPages(pages, areas) {
  const existing = new Set(pages);
  return areas.flatMap(a => (a.help ?? []).filter(p => !existing.has(p)).map(p => `${a.id}: ${p}`));
}

/**
 * The code-health findings of the `test-areas` rule ({rule, path, line, message}, as
 * scripts/lib/codeHealth.mjs reports them): files under __tests__/ and src/ no area claims, help
 * pages (file names in docs/user/) no area names, and help pages an area names that don't exist.
 */
export function areaFindings({files, helpPages, areas}) {
  const findings = [];
  const add = (path, message) => findings.push({rule: 'test-areas', path, line: 1, message});
  const owned = files.filter(f => f.startsWith('__tests__/') || f.startsWith('src/'));
  for (const f of assign(owned, areas).unassigned) {
    add(f, 'belongs to no feature area - add it to an area in scripts/test-areas.json');
  }
  for (const p of helpPagesWithoutArea(helpPages, areas)) {
    add(`docs/user/${p}`, 'no feature area names this help page - add it to an area in scripts/test-areas.json');
  }
  for (const m of missingHelpPages(helpPages, areas)) {
    add('scripts/test-areas.json', `names a help page that does not exist (${m})`);
  }
  return findings;
}

/** Test files are the Jest test files (`*.test.ts(x)`); every other file under __tests__/ is test data. */
export const isTestFile = path => /^__tests__\/.*\.test\.tsx?$/.test(path);

/**
 * The kind of a test file for the matrix: 'scenario' (__tests__/scenarios/), 'ui' (__tests__/ui/)
 * or 'unit' (everything else: domain, storage, utils, supernote, docs, fakeDevice and the root).
 */
export function testKind(path) {
  if (path.startsWith('__tests__/scenarios/')) return 'scenario';
  if (path.startsWith('__tests__/ui/')) return 'ui';
  return 'unit';
}

/** The test files of the areas `ids` (unknown ids throw, naming the known ones). */
export function testFilesOf(ids, areas, paths) {
  const known = areas.map(a => a.id);
  const unknown = ids.filter(id => !known.includes(id));
  if (unknown.length) throw new Error(`unknown area ${unknown.join(', ')} - areas: ${known.join(', ')}`);
  const {byArea} = assign(paths.filter(isTestFile), areas);
  return ids.flatMap(id => byArea[id]);
}

const pct = n => (n === null || n === undefined ? '-' : n.toFixed(1));
const delta = (now, base) => {
  if (now === null || base === undefined) return '';
  // Rounded first, so 66.17 against 66.2 reads +0.0, not -0.0.
  const d = Math.round((now - base) * 10) / 10 || 0;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
};

/**
 * Per area: test counts by kind, smoke tests, source lines and coverage.
 *   testsPerFile: {testFile: number of tests}
 *   coverage: {srcFile: {lines: {total, covered}, branches: {total, covered}}} (paths relative to the root)
 *   scenariosPerFile: {testFile: number of catalogued scenarios}
 *   smokeDir: e.g. '__tests__/scenarios/smoke/'
 * Returns [{id, name, unit, ui, scenario, smoke, scenarios, srcLines, linesCovered, branchTotal,
 * branchCovered, lines, branches}] with
 * lines/branches as percentages (null when the area has no measured source lines).
 */
export function areaStats({areas, testsPerFile, coverage, scenariosPerFile = {}, smokeDir}) {
  const testPaths = Object.keys(testsPerFile);
  const tests = assign(testPaths, areas).byArea;
  const sources = assign(Object.keys(coverage), areas).byArea;
  return areas.map(area => {
    const row = {id: area.id, name: area.name, unit: 0, ui: 0, scenario: 0, smoke: 0, scenarios: 0};
    for (const f of tests[area.id]) {
      row[testKind(f)] += testsPerFile[f];
      if (smokeDir && f.startsWith(smokeDir)) row.smoke += testsPerFile[f];
      row.scenarios += scenariosPerFile[f] ?? 0;
    }
    let lt = 0, lc = 0, bt = 0, bc = 0;
    for (const f of sources[area.id]) {
      lt += coverage[f].lines.total;
      lc += coverage[f].lines.covered;
      bt += coverage[f].branches.total;
      bc += coverage[f].branches.covered;
    }
    Object.assign(row, {srcLines: lt, linesCovered: lc, branchTotal: bt, branchCovered: bc});
    row.lines = lt ? (100 * lc) / lt : null;
    row.branches = bt ? (100 * bc) / bt : null;
    return row;
  });
}

/** The matrix as markdown (coverage/areas.md): one row per area plus a total, Δ against `baseline` lines %. */
export function renderMatrix(stats, baseline = {}, title = 'Test coverage by feature area') {
  const lines = [
    `# ${title}`,
    '',
    'Unit, UI, Scenario: tests per kind (smoke counted again in its own column). Scenarios: catalogued',
    'scenarios (`docs/dev/test-scenarios.md`). Line % and Branch %: of the area\'s source files.',
    'Δ: line and branch points against `scripts/coverage-baseline.json`.',
    '',
    '| Area | Unit | UI | Scenario | Smoke | Scenarios | Src lines | Line % | Branch % | Δ vs baseline |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
  ];
  const total = {unit: 0, ui: 0, scenario: 0, smoke: 0, scenarios: 0, srcLines: 0, linesCovered: 0, branchTotal: 0, branchCovered: 0};
  for (const s of stats) {
    const base = baseline[s.id] ?? {};
    const d = [delta(s.lines, base.lines), delta(s.branches, base.branches)].filter(Boolean).join(' / ');
    lines.push(`| ${s.name} (\`${s.id}\`) | ${s.unit} | ${s.ui} | ${s.scenario} | ${s.smoke} | ${s.scenarios} | ${s.srcLines} | ${pct(s.lines)} | ${pct(s.branches)} | ${d} |`);
    for (const k of Object.keys(total)) total[k] += s[k];
  }
  const allLines = total.srcLines ? (100 * total.linesCovered) / total.srcLines : null;
  const allBranches = total.branchTotal ? (100 * total.branchCovered) / total.branchTotal : null;
  lines.push(`| **All** | ${total.unit} | ${total.ui} | ${total.scenario} | ${total.smoke} | ${total.scenarios} | ${total.srcLines} | ${pct(allLines)} | ${pct(allBranches)} | |`);
  return lines.join('\n') + '\n';
}

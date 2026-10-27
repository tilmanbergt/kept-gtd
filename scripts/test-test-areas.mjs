// Plain-node checks for scripts/lib/testAreas.mjs.  Run: node scripts/test-test-areas.mjs
// Design scenarios 1-3: docs/dev/history/technical-design-test-tiers.md §5.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  areaFindings,
  areaOf,
  areaStats,
  assign,
  globToRegExp,
  helpPagesWithoutArea,
  renderMatrix,
  testFilesOf,
  testKind,
} from './lib/testAreas.mjs';

let n = 0;
function t(name, fn) {
  try {
    fn();
  } catch (e) {
    e.message = `${name}: ${e.message}`;
    throw e;
  }
  n++;
}

const AREAS = [
  {id: 'planning', name: 'Daily, Week and Month', help: ['daily.md', 'week-and-month.md'],
    tests: ['__tests__/**/*{daily,month}*'], sources: ['src/screens/{DailyView,MonthView}.ts*', 'src/storage/{daily,monthly}Aggregate.ts']},
  {id: 'threads', name: 'Threads', help: ['threads.md'], tests: ['__tests__/**/*thread*'], sources: ['src/screens/thread/**']},
  {id: 'foundation', name: 'Foundation', help: [], tests: ['__tests__/ui/taskRow*'], sources: ['src/utils/**', 'App.tsx']},
];

t('globs', () => {
  assert.ok(globToRegExp('src/**').test('src/a/b/c.ts'));
  assert.ok(globToRegExp('src/**/x.ts').test('src/x.ts'));
  assert.ok(globToRegExp('src/**/x.ts').test('src/a/b/x.ts'));
  assert.ok(!globToRegExp('src/*.ts').test('src/a/x.ts'));
  assert.ok(globToRegExp('src/{a,b}?.ts').test('src/b1.ts'));
  assert.ok(globToRegExp('src/screens/{DailyView,MonthView}.ts*').test('src/screens/MonthView.tsx'));
  assert.ok(!globToRegExp('src/screens/{DailyView,MonthView}.ts*').test('src/screens/WeekView.tsx'));
  assert.ok(globToRegExp('__tests__/**/*{daily,month}*').test('__tests__/storage/dailyAggregate.test.ts'));
  assert.ok(!globToRegExp('src/a.ts').test('src/abts'), 'dots are literal');
});

t('first matching area wins', () => {
  const areas = [{id: 'a', sources: ['src/x/**']}, {id: 'b', sources: ['src/**']}];
  assert.equal(areaOf('src/x/y.ts', areas), 'a');
  assert.equal(areaOf('src/z.ts', areas), 'b');
  assert.equal(areaOf('lib/z.ts', areas), null);
});

t('assign', () => {
  const {byArea, unassigned} = assign(
    ['src/screens/DailyView.tsx', 'src/screens/thread/ThreadsTab.tsx', '__tests__/storage/dailyAggregate.test.ts', 'src/generated/userDocs.ts', 'src/ui/New.tsx'],
    AREAS,
  );
  assert.deepEqual(byArea.planning, ['src/screens/DailyView.tsx', '__tests__/storage/dailyAggregate.test.ts']);
  assert.deepEqual(byArea.threads, ['src/screens/thread/ThreadsTab.tsx']);
  assert.deepEqual(byArea.foundation, []);
  assert.deepEqual(unassigned, ['src/ui/New.tsx'], 'src/generated/ needs no area');
});

t('scenario 1: an unassigned test file is a finding naming the file and test-areas.json', () => {
  const pages = ['daily.md', 'week-and-month.md', 'threads.md'];
  const findings = areaFindings({files: ['__tests__/ui/newThing.test.tsx', 'src/utils/log.ts', 'scripts/x.mjs'], helpPages: pages, areas: AREAS});
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'test-areas');
  assert.equal(findings[0].path, '__tests__/ui/newThing.test.tsx');
  assert.match(findings[0].message, /scripts\/test-areas\.json/);
});

t('scenario 2: a help page without an area is a finding naming the page', () => {
  assert.deepEqual(helpPagesWithoutArea(['index.md', 'daily.md', 'philosophy.md', 'getting-started.md', 'troubleshooting.md', 'new-page.md'], AREAS), ['new-page.md']);
  const findings = areaFindings({files: [], helpPages: ['daily.md', 'week-and-month.md', 'threads.md', 'new-page.md'], areas: AREAS});
  assert.deepEqual(findings.map(f => f.path), ['docs/user/new-page.md']);
  const missing = areaFindings({files: [], helpPages: ['daily.md'], areas: AREAS});
  assert.deepEqual(missing.map(f => f.message.match(/\((.*)\)/)[1]), ['planning: week-and-month.md', 'threads: threads.md']);
});

t('scenario 3: an area run gets exactly the test files of that area', () => {
  const paths = ['__tests__/storage/dailyAggregate.test.ts', '__tests__/scenarios/month.test.tsx', '__tests__/scenarios/__golden__/daily.json', '__tests__/ui/threadsTab.test.tsx', 'src/screens/DailyView.tsx'];
  assert.deepEqual(testFilesOf(['planning'], AREAS, paths), ['__tests__/storage/dailyAggregate.test.ts', '__tests__/scenarios/month.test.tsx']);
  assert.deepEqual(testFilesOf(['planning', 'threads'], AREAS, paths).length, 3);
  assert.throws(() => testFilesOf(['plannig'], AREAS, paths), /unknown area plannig - areas: planning, threads, foundation/);
});

t('test kinds', () => {
  assert.equal(testKind('__tests__/scenarios/smoke/daily.test.tsx'), 'scenario');
  assert.equal(testKind('__tests__/ui/x.test.tsx'), 'ui');
  assert.equal(testKind('__tests__/domain/x.test.ts'), 'unit');
  assert.equal(testKind('__tests__/keptGtdKeepList.test.ts'), 'unit');
});

t('area stats and matrix', () => {
  const stats = areaStats({
    areas: AREAS,
    testsPerFile: {'__tests__/storage/dailyAggregate.test.ts': 4, '__tests__/scenarios/smoke/daily.test.tsx': 2, '__tests__/ui/threadsTab.test.tsx': 3},
    coverage: {
      'src/screens/DailyView.tsx': {lines: {total: 100, covered: 50}, branches: {total: 10, covered: 4}},
      'src/storage/dailyAggregate.ts': {lines: {total: 100, covered: 100}, branches: {total: 10, covered: 10}},
      'src/utils/log.ts': {lines: {total: 0, covered: 0}, branches: {total: 0, covered: 0}},
    },
    scenariosPerFile: {'__tests__/scenarios/smoke/daily.test.tsx': 2},
    smokeDir: '__tests__/scenarios/smoke/',
  });
  const planning = stats.find(s => s.id === 'planning');
  assert.deepEqual([planning.unit, planning.ui, planning.scenario, planning.smoke, planning.scenarios], [4, 0, 2, 2, 2]);
  assert.equal(planning.srcLines, 200);
  assert.equal(planning.lines, 75);
  assert.equal(planning.branches, 70);
  assert.equal(stats.find(s => s.id === 'threads').ui, 3);
  assert.equal(stats.find(s => s.id === 'foundation').lines, null, 'no measured lines');
  const md = renderMatrix(stats, {planning: {lines: 77, branches: 70}});
  assert.match(md, /\| Daily, Week and Month \(`planning`\) \| 4 \| 0 \| 2 \| 2 \| 2 \| 200 \| 75\.0 \| 70\.0 \| -2\.0 \/ \+0\.0 \|/);
  assert.match(md, /\| Foundation \(`foundation`\) \| 0 \| 0 \| 0 \| 0 \| 0 \| 0 \| - \| - \| {2}\|/);
  assert.match(md, /\| \*\*All\*\* \| 4 \| 3 \| 2 \| 2 \| 2 \| 200 \| 75\.0 \| 70\.0 \| \|/);
});

t('the real areas file is well formed', () => {
  const real = JSON.parse(readFileSync(new URL('./test-areas.json', import.meta.url), 'utf8'));
  const ids = real.areas.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, 'area ids are unique');
  for (const a of real.areas) {
    assert.ok(a.name && Array.isArray(a.help) && Array.isArray(a.tests) && Array.isArray(a.sources), `area ${a.id} has name, help, tests, sources`);
    [...a.tests, ...a.sources].forEach(globToRegExp);
  }
  assert.ok(real.smoke.endsWith('/'));
});

console.log(`test-areas: ${n} groups passed`);

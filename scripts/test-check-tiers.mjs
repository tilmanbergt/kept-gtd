// Plain-node checks for scripts/lib/checkTiers.mjs.  Run: node scripts/test-check-tiers.mjs
// Design scenarios 3-4: docs/dev/history/technical-design-test-tiers.md §5.
import assert from 'node:assert/strict';
import {jestArgs, jestPlan, parseCheckArgs, tierLabel} from './lib/checkTiers.mjs';

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

const SMOKE = ['__tests__/scenarios/smoke/daily.test.tsx', '__tests__/scenarios/smoke/appStarts.test.tsx'];

t('flags', () => {
  assert.deepEqual(parseCheckArgs([]), {quick: false, smoke: false, affected: false, coverage: false, areas: []});
  assert.deepEqual(parseCheckArgs(['--area', 'planning,threads', '--smoke']).areas, ['planning', 'threads']);
  assert.deepEqual(parseCheckArgs(['--area=planning', '--area', 'review']).areas, ['planning', 'review']);
  assert.throws(() => parseCheckArgs(['--area']), /needs area ids/);
  assert.throws(() => parseCheckArgs(['--area', '--smoke']), /needs area ids/);
  assert.throws(() => parseCheckArgs(['--fast']), /unknown flag --fast/);
  assert.throws(() => parseCheckArgs(['--coverage', '--smoke']), /does not combine/);
});

t('tier names', () => {
  const label = argv => tierLabel(parseCheckArgs(argv));
  assert.equal(label([]), 'full');
  assert.equal(label(['--quick']), 'quick');
  assert.equal(label(['--smoke']), 'smoke');
  assert.equal(label(['--quick', '--smoke']), 'smoke');
  assert.equal(label(['--area', 'planning']), 'area: planning');
  assert.equal(label(['--area', 'planning', '--smoke']), 'area: planning + smoke');
  assert.equal(label(['--affected']), 'affected');
  assert.equal(label(['--affected', '--smoke']), 'affected');
  assert.equal(label(['--coverage']), 'full + coverage');
});

t('full, quick and coverage plans', () => {
  assert.deepEqual(jestPlan(parseCheckArgs([])), {kind: 'all'});
  assert.deepEqual(jestPlan(parseCheckArgs(['--coverage'])), {kind: 'all'});
  assert.deepEqual(jestPlan(parseCheckArgs(['--quick'])), {kind: 'none'});
  assert.equal(jestArgs({kind: 'none'}), null);
  assert.deepEqual(jestArgs({kind: 'all'}), []);
  assert.deepEqual(jestArgs({kind: 'all'}, {coverageArgs: ['--coverage']}), ['--coverage']);
});

t('scenario 3: an area run runs exactly its test files by path', () => {
  const plan = jestPlan(parseCheckArgs(['--area', 'planning']), {areaTestFiles: ['__tests__/b.test.ts', '__tests__/a.test.ts'], smokeFiles: SMOKE});
  assert.deepEqual(plan, {kind: 'paths', files: ['__tests__/a.test.ts', '__tests__/b.test.ts']});
  assert.deepEqual(jestArgs(plan), ['--runTestsByPath', '__tests__/a.test.ts', '__tests__/b.test.ts', '--passWithNoTests']);
  const withSmoke = jestPlan(parseCheckArgs(['--area', 'planning', '--smoke']), {areaTestFiles: [SMOKE[0]], smokeFiles: SMOKE});
  assert.deepEqual(withSmoke.files, [...SMOKE].sort(), 'no duplicates');
});

t('scenario 4: affected with no changes runs only smoke', () => {
  const plan = jestPlan(parseCheckArgs(['--affected']), {smokeFiles: SMOKE, changedFiles: []});
  assert.deepEqual(plan, {kind: 'related', files: [...SMOKE].sort()});
  const docsOnly = jestPlan(parseCheckArgs(['--affected']), {smokeFiles: SMOKE, changedFiles: ['docs/user/daily.md', 'scripts/check.mjs', 'package.json']});
  assert.deepEqual(docsOnly.files, [...SMOKE].sort(), 'files Jest cannot relate are left out');
});

t('affected relates the changed sources and adds smoke', () => {
  const plan = jestPlan(parseCheckArgs(['--affected']), {smokeFiles: SMOKE, changedFiles: ['src/domain/period.ts', 'App.tsx', 'test-helpers/scenario/app.tsx']});
  assert.deepEqual(plan.files, ['App.tsx', ...[...SMOKE].sort(), 'src/domain/period.ts', 'test-helpers/scenario/app.tsx']);
  assert.equal(jestArgs(plan)[0], '--findRelatedTests');
  assert.equal(jestArgs({kind: 'related', files: []}), null, 'nothing to run');
});

console.log(`check-tiers: ${n} groups passed`);

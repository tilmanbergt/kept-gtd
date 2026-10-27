// Plain-node checks for scripts/lib/coverageReport.mjs.  Run: node scripts/test-coverage-report.mjs
// Design scenarios 5-6: docs/dev/history/technical-design-test-tiers.md §5.
import assert from 'node:assert/strict';
import {coverageByFile, formatFailures, raiseBaseline, ratchetFailures, relativePath, testsPerFile} from './lib/coverageReport.mjs';

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

const stat = (id, lines, branches) => ({id, lines, branches});

t('paths and inputs', () => {
  assert.equal(relativePath('/repo/src/a.ts', '/repo'), 'src/a.ts');
  assert.equal(relativePath('C:\\repo\\src\\a.ts', 'C:\\repo\\'), 'src/a.ts');
  const cov = coverageByFile(
    {total: {lines: {total: 9}}, '/repo/src/a.ts': {lines: {total: 10, covered: 5}, branches: {total: 2, covered: 1}, functions: {}}},
    '/repo',
  );
  assert.deepEqual(cov, {'src/a.ts': {lines: {total: 10, covered: 5}, branches: {total: 2, covered: 1}}});
  const tests = testsPerFile({testResults: [{name: '/repo/__tests__/a.test.ts', assertionResults: [{}, {}, {}]}]}, '/repo');
  assert.deepEqual(tests, {'__tests__/a.test.ts': 3});
});

t('scenario 5: an area more than 2 points below its baseline fails, naming the area and both numbers', () => {
  const baseline = {planning: {lines: 52, branches: 40}};
  const failures = ratchetFailures([stat('planning', 49, 40)], baseline);
  assert.deepEqual(failures, [{id: 'planning', metric: 'lines', now: 49, base: 52}]);
  assert.deepEqual(formatFailures(failures), ['planning: lines 49.0 % is more than 2.0 points below its baseline of 52.0 %']);
  assert.deepEqual(ratchetFailures([stat('planning', 50.5, 40)], baseline), [], '1.5 points below passes');
  assert.deepEqual(ratchetFailures([stat('planning', 50, 37.9)], baseline).map(f => f.metric), ['branches']);
  assert.deepEqual(ratchetFailures([stat('review', 1, 1), stat('planning', null, null)], baseline), [], 'no baseline or no lines: not checked');
});

t('scenario 6: the baseline only rises', () => {
  const baseline = {planning: {lines: 52, branches: 40}, review: {lines: 50, branches: 30}};
  const next = raiseBaseline([stat('planning', 49.04, 45.06), stat('review', 51.23, 30), stat('tags', 80, 70), stat('foundation', null, null)], baseline);
  assert.deepEqual(next, {planning: {lines: 52, branches: 45.1}, review: {lines: 51.2, branches: 30}, tags: {lines: 80, branches: 70}});
});

console.log(`coverage-report: ${n} groups passed`);

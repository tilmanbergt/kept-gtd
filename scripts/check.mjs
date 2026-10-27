#!/usr/bin/env node
// All local checks in one go, in tiers (docs/dev/history/technical-design-test-tiers.md §3.2):
//
//   npm run check                        full: quick + all of Jest (unit and scenario tests)
//   npm run check -- --quick             quick: gen, tsc and ESLint (in parallel), script tests,
//                                        scenario catalog, code health
//   npm run check -- --smoke             quick + the smoke scenarios (__tests__/scenarios/smoke/)
//   npm run check -- --area a,b          quick + the test files of feature areas a and b (scripts/test-areas.json)
//   npm run check -- --affected          quick + the tests related to the files changed against
//                                        origin/main (committed or not) + smoke
//   npm run check -- --coverage          full with coverage, then the area matrix coverage/areas.md and the
//                                        ratchet against scripts/coverage-baseline.json
//
// Flags combine (--area planning --smoke). Stops at the first failing check; the last line names
// the tier. Which moment runs which tier: docs/dev/DEVELOPMENT-POLICY.md §7.

import {spawn, spawnSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {jestArgs, jestPlan, parseCheckArgs, tierLabel} from './lib/checkTiers.mjs';
import {testFilesOf} from './lib/testAreas.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** ESLint warnings allowed (null = any number). */
const LINT_MAX_WARNINGS = 0;
/** Jest's coverage run (reporters in jest.config.js), with the test results per file for the area matrix. */
const COVERAGE_ARGS = ['--coverage', '--json', '--outputFile=coverage/jest-results.json'];
/** When true, any code-health finding fails the check. */
const CODE_HEALTH_STRICT = true;

let opts;
try {
  opts = parseCheckArgs(process.argv.slice(2));
} catch (e) {
  console.error(`check: ${e.message}`);
  process.exit(2);
}
const tier = tierLabel(opts);
const started = Date.now();

const lintArgs = ['eslint', 'src', 'App.tsx', 'index.js', '__tests__', 'test-helpers'];
if (LINT_MAX_WARNINGS !== null) lintArgs.push('--max-warnings', String(LINT_MAX_WARNINGS));

const SCRIPT_TESTS = [
  ['script tests', 'scripts/test-versioning.mjs'],
  ['help page tests', 'scripts/test-userdocs.mjs'],
  ['code-health tests', 'scripts/test-code-health.mjs'],
  ['scenario catalog tests', 'scripts/test-scenario-catalog.mjs'],
  ['test area tests', 'scripts/test-test-areas.mjs'],
  ['check tier tests', 'scripts/test-check-tiers.mjs'],
  ['coverage report tests', 'scripts/test-coverage-report.mjs'],
  ['CI build tests', 'scripts/test-ci-build.mjs'],
  ['test notes tests', 'scripts/test-test-notes.mjs'],
];

function fail(name, status) {
  console.error(`\nCHECK FAILED: ${name} (exit ${status}). Fix it before committing.`);
  process.exit(1);
}

// shell: true so npx resolves to npx.cmd on Windows.
function run(name, cmd, args) {
  console.log(`\n--- ${name}`);
  const r = spawnSync([cmd, ...args].join(' '), {cwd: ROOT, stdio: 'inherit', shell: true});
  if (r.status !== 0) fail(name, r.status);
}

/** Runs a command with its output collected, so two can run at the same time and print one after the other. */
function runCollected(cmd, args) {
  return new Promise(done => {
    const child = spawn([cmd, ...args].join(' '), {cwd: ROOT, shell: true, env: {...process.env, FORCE_COLOR: '0'}});
    let output = '';
    child.stdout.on('data', d => (output += d));
    child.stderr.on('data', d => (output += d));
    child.on('close', status => done({status, output}));
  });
}

async function runParallel(steps) {
  console.log(`\n--- ${steps.map(s => s.name).join(' and ')} (in parallel)`);
  const results = await Promise.all(steps.map(s => runCollected(s.cmd, s.args)));
  steps.forEach((s, i) => {
    console.log(`\n--- ${s.name}: ${results[i].status === 0 ? 'passed' : `FAILED (exit ${results[i].status})`}`);
    if (results[i].output.trim()) console.log(results[i].output.trimEnd());
  });
  const failed = steps.findIndex((_, i) => results[i].status !== 0);
  if (failed >= 0) fail(steps[failed].name, results[failed].status);
}

function git(args) {
  const r = spawnSync('git', args, {cwd: ROOT, encoding: 'utf8'});
  return r.status === 0 ? r.stdout.split(/\r?\n/).filter(Boolean) : null;
}

/** Files changed against the merge base with origin/main, plus uncommitted and untracked ones; null when there is no base. */
function changedFiles() {
  const base = (git(['merge-base', 'HEAD', 'origin/main']) ?? [])[0];
  if (!base) return null;
  const files = new Set([
    ...(git(['diff', '--name-only', base]) ?? []),
    ...(git(['ls-files', '--others', '--exclude-standard']) ?? []),
  ]);
  return [...files].filter(f => existsSync(join(ROOT, f))).sort();
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(ROOT, full).split('\\').join('/'));
  }
  return out;
}

function jestCommand() {
  const config = JSON.parse(readFileSync(join(ROOT, 'scripts', 'test-areas.json'), 'utf8'));
  const testFiles = walk(join(ROOT, '__tests__'));
  const smokeFiles = testFiles.filter(f => f.startsWith(config.smoke) && /\.test\.tsx?$/.test(f));
  let changed = [];
  if (opts.affected) {
    changed = changedFiles();
    if (changed === null) {
      console.log('\n--- affected: no merge base with origin/main (git fetch origin main?) - running all of Jest instead');
      return {name: 'tests (jest, all: no base for --affected)', args: []};
    }
  }
  let areaTestFiles = [];
  try {
    areaTestFiles = testFilesOf(opts.areas, config.areas, testFiles);
  } catch (e) {
    console.error(`check: ${e.message}`);
    process.exit(2);
  }
  const plan = jestPlan(opts, {areaTestFiles, smokeFiles, changedFiles: changed});
  const args = jestArgs(plan, {coverageArgs: opts.coverage ? COVERAGE_ARGS : []});
  if (args === null) return null;
  const what = plan.kind === 'all' ? 'all' : `${plan.files.length} ${plan.kind === 'related' ? 'changed or smoke files' : 'test files'}`;
  return {name: `tests (jest, ${what})`, args};
}

run('generate src/generated', 'node', ['scripts/gen-bundled-content.mjs']);
await runParallel([
  {name: 'type check (tsc)', cmd: 'npx', args: ['tsc', '--noEmit']},
  {name: 'lint (eslint)', cmd: 'npx', args: lintArgs},
]);
for (const [name, script] of SCRIPT_TESTS) run(name, 'node', [script]);
run('scenario catalog up to date', 'node', ['scripts/scenario-catalog.mjs', '--check']);
run('code health', 'node', ['scripts/code-health.mjs', ...(CODE_HEALTH_STRICT ? ['--strict'] : [])]);

const jest = jestCommand();
if (jest) run(jest.name, 'npx', ['jest', ...jest.args]);
if (opts.coverage) run('coverage by feature area (coverage/areas.md, ratchet)', 'node', ['scripts/coverage-report.mjs']);
else console.log(`\n--- tests (jest): ${tier === 'quick' ? 'skipped (--quick)' : 'nothing to run'}`);

console.log(`\nAll checks passed (${tier}) in ${Math.round((Date.now() - started) / 1000)} s.`);

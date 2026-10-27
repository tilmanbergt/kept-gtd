#!/usr/bin/env node
// The coverage overview per feature area and its ratchet (docs/dev/history/technical-design-test-tiers.md §3.5).
// Runs after a coverage run of Jest (npm run coverage); reads coverage/coverage-summary.json,
// coverage/jest-results.json, scripts/test-areas.json and the scenario tests.
//
//   node scripts/coverage-report.mjs                    write coverage/areas.md; exit 1 when an area's line or
//                                                      branch % is more than 2 points below scripts/coverage-baseline.json
//   node scripts/coverage-report.mjs --update-baseline  raise the baseline to the current values (never lowers it)

import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {coverageByFile, formatFailures, raiseBaseline, ratchetFailures, testsPerFile} from './lib/coverageReport.mjs';
import {parseScenarios} from './lib/scenarioCatalog.mjs';
import {areaStats, renderMatrix} from './lib/testAreas.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUMMARY = join(ROOT, 'coverage', 'coverage-summary.json');
const RESULTS = join(ROOT, 'coverage', 'jest-results.json');
const BASELINE = join(ROOT, 'scripts', 'coverage-baseline.json');
const OUT = join(ROOT, 'coverage', 'areas.md');

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

for (const input of [SUMMARY, RESULTS]) {
  if (!existsSync(input)) {
    console.error(`coverage-report: ${relative(ROOT, input)} is missing - run npm run coverage first.`);
    process.exit(1);
  }
}

/** Scenario test files under `dir` (relative to the root) with how many scenarios each has. */
function scenariosPerFile(dir) {
  const out = {};
  const walk = d => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.test\.tsx?$/.test(name)) {
        const file = relative(ROOT, full).split('\\').join('/');
        out[file] = parseScenarios(readFileSync(full, 'utf8'), file).length;
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

const config = readJson(join(ROOT, 'scripts', 'test-areas.json'));
const stats = areaStats({
  areas: config.areas,
  testsPerFile: testsPerFile(readJson(RESULTS), ROOT),
  coverage: coverageByFile(readJson(SUMMARY), ROOT),
  scenariosPerFile: scenariosPerFile(join(ROOT, '__tests__', 'scenarios')),
  smokeDir: config.smoke,
});
const baseline = existsSync(BASELINE) ? readJson(BASELINE).areas : {};

if (process.argv.includes('--update-baseline')) {
  const next = raiseBaseline(stats, baseline);
  writeFileSync(BASELINE, JSON.stringify({about: 'Line and branch coverage % per feature area that npm run coverage may not fall more than 2 points below (scripts/coverage-report.mjs). Raised by --update-baseline; lowered only by hand, explained in the commit.', areas: next}, null, 2) + '\n', 'utf8');
  console.log('coverage-report: baseline updated in scripts/coverage-baseline.json');
  process.exit(0);
}

const matrix = renderMatrix(stats, baseline);
writeFileSync(OUT, matrix, 'utf8');
console.log(matrix);
console.log('coverage-report: wrote coverage/areas.md');

const failures = ratchetFailures(stats, baseline);
if (failures.length) {
  console.error('\nCoverage dropped below the baseline (scripts/coverage-baseline.json):');
  formatFailures(failures).forEach(l => console.error(`  ${l}`));
  console.error('Add tests for what the change left uncovered. A drop that is right (code removed on purpose) is a hand edit of the baseline, explained in the commit.');
  process.exit(1);
}

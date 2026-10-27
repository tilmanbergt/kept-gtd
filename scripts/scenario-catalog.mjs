#!/usr/bin/env node
// The readable list of scenario tests, docs/dev/test-scenarios.md
// (docs/dev/history/technical-design-quality-hardening.md §4.4). Reads __tests__/scenarios/ with its subfolders;
// scenarios in the smoke folder (scripts/test-areas.json) are marked "(smoke)" (technical-design-test-tiers.md §3.6).
//
//   node scripts/scenario-catalog.mjs          write the catalog
//   node scripts/scenario-catalog.mjs --check  exit 1 when the catalog is not up to date (npm run check)

import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseScenarios, renderCatalog} from './lib/scenarioCatalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, '__tests__', 'scenarios');
const OUT = join(ROOT, 'docs', 'dev', 'test-scenarios.md');

const SMOKE = JSON.parse(readFileSync(join(ROOT, 'scripts', 'test-areas.json'), 'utf8')).smoke;

/** The test files under `dir`, as paths relative to __tests__/scenarios/, sorted. */
function testFiles(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .flatMap(name => (statSync(join(dir, name)).isDirectory() ? testFiles(join(dir, name), `${prefix}${name}/`) : /\.test\.tsx?$/.test(name) ? [`${prefix}${name}`] : []))
    .sort();
}

const scenarios = testFiles(DIR).flatMap(f => {
  const file = `__tests__/scenarios/${f}`;
  return parseScenarios(readFileSync(join(DIR, f), 'utf8'), file).map(s => ({...s, smoke: file.startsWith(SMOKE)}));
});
const catalog = renderCatalog(scenarios);

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== catalog) {
    console.error('scenario-catalog: docs/dev/test-scenarios.md is out of date - run npm run scenarios and commit it.');
    process.exit(1);
  }
  console.log(`scenario-catalog: up to date (${scenarios.length} scenarios)`);
} else {
  writeFileSync(OUT, catalog, 'utf8');
  console.log(`scenario-catalog: wrote ${scenarios.length} scenarios to docs/dev/test-scenarios.md`);
}

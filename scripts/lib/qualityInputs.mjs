// The repository inputs of the quality report and the coverage matrix's Help ✓ column
// (docs/dev/history/technical-design-quality-assurance.md §3.3, §5): help pages, scenarios, the
// app's sources and the demo space. The file reading lives here, shared by
// scripts/quality-report.mjs and scripts/coverage-report.mjs; the logic they apply is pure, in
// helpCoverage.mjs, helpLabels.mjs and appStrings.mjs.

import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {parseScenarios} from './scenarioCatalog.mjs';
import {importTs} from './tsModule.mjs';
import {coverHeadings, helpHeadings} from './helpCoverage.mjs';

const read = path => readFileSync(path, 'utf8').replace(/^\uFEFF/, '');

/** Every file under `dir` (absolute paths), recursively. */
export function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (root, path) => relative(root, path).split('\\').join('/');

/** The help pages: [{id, markdown}]. */
export function readHelpPages(root) {
  const dir = join(root, 'docs', 'user');
  return readdirSync(dir).filter(f => f.endsWith('.md')).sort().map(f => ({id: f.slice(0, -3), markdown: read(join(dir, f))}));
}

/** Every scenario under __tests__/scenarios/, with its file relative to the root. */
export function readScenarios(root) {
  return walk(join(root, '__tests__', 'scenarios'))
    .filter(f => /\.test\.tsx?$/.test(f))
    .sort()
    .flatMap(f => parseScenarios(read(f), rel(root, f)));
}

/** The help pages' headings with the scenarios that name them (coverHeadings) and the exclusions. */
export async function readHelpCoverage(root) {
  const {pageAnchors} = await importTs(join(root, 'src', 'domain', 'helpLinks.ts'));
  const config = JSON.parse(read(join(root, 'scripts', 'help-coverage.json')));
  const excluded = config.excluded ?? {};
  const coverage = coverHeadings(helpHeadings(readHelpPages(root), pageAnchors), readScenarios(root), excluded);
  return {coverage, excluded};
}

/** The app's sources: every .ts/.tsx under src/ except src/generated/, and App.tsx: [{path, source}]. */
export function readAppSources(root) {
  const files = walk(join(root, 'src')).filter(f => /\.tsx?$/.test(f) && !rel(root, f).startsWith('src/generated/'));
  files.push(join(root, 'App.tsx'));
  return files.map(f => ({path: rel(root, f), source: read(f)}));
}

/** The demo space's files (domain/demoSpace.ts buildDemoFiles), as the help example test loads them. */
export async function readDemoFiles(root) {
  const {buildDemoFiles} = await importTs(join(root, 'src', 'domain', 'demoSpace.ts'));
  return buildDemoFiles(new Date(2026, 9, 1));
}

/** The diagram sources in docs/user/diagrams/ (.mmd and .html): [{path, source}]. */
export function readDiagramSources(root) {
  return walk(join(root, 'docs', 'user', 'diagrams'))
    .filter(f => /\.(mmd|html)$/.test(f))
    .sort()
    .map(f => ({path: rel(root, f), source: read(f)}));
}

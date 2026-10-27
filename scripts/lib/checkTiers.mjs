// Pure parts of scripts/check.mjs: read the tier flags, name the tier, and plan the Jest run.
// No I/O here, so scripts/test-check-tiers.mjs can test them.
// Design: docs/dev/history/technical-design-test-tiers.md §3.2.

export const USAGE = [
  'npm run check                       full: quick + all of Jest',
  'npm run check -- --quick            quick: gen, tsc and ESLint, script tests, catalog, code health',
  'npm run check -- --smoke            quick + the smoke scenarios',
  'npm run check -- --area a,b         quick + the tests of feature areas a and b (scripts/test-areas.json)',
  'npm run check -- --affected         quick + the tests related to the files changed against origin/main + smoke',
  'npm run check -- --coverage         full with coverage, then the area matrix and the ratchet',
  'Flags combine, e.g. --area planning --smoke.',
].join('\n');

/**
 * The tier flags: {quick, smoke, affected, coverage, areas: [ids]}. Throws on an unknown flag, an
 * --area without ids, or --coverage together with a smaller tier (coverage always runs everything).
 */
export function parseCheckArgs(argv) {
  const opts = {quick: false, smoke: false, affected: false, coverage: false, areas: []};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--quick') opts.quick = true;
    else if (arg === '--smoke') opts.smoke = true;
    else if (arg === '--affected') opts.affected = true;
    else if (arg === '--coverage') opts.coverage = true;
    else if (arg === '--area' || arg.startsWith('--area=')) {
      const value = arg === '--area' ? argv[++i] : arg.slice('--area='.length);
      const ids = (value ?? '').split(',').map(s => s.trim()).filter(Boolean);
      if (!ids.length || (value ?? '').startsWith('--')) throw new Error('--area needs area ids, e.g. --area planning,threads');
      opts.areas.push(...ids);
    } else throw new Error(`unknown flag ${arg}\n${USAGE}`);
  }
  if (opts.coverage && (opts.quick || opts.smoke || opts.affected || opts.areas.length)) {
    throw new Error('--coverage runs every test; it does not combine with --quick, --smoke, --area or --affected');
  }
  return opts;
}

/** Whether the flags ask for less than all of Jest. */
const partial = opts => opts.smoke || opts.affected || opts.areas.length > 0;

/** The tier's name for the summary line, e.g. "full", "quick", "area: planning + smoke", "full + coverage". */
export function tierLabel(opts) {
  if (opts.coverage) return 'full + coverage';
  if (!partial(opts)) return opts.quick ? 'quick' : 'full';
  const parts = [];
  if (opts.areas.length) parts.push(`area: ${opts.areas.join(', ')}`);
  if (opts.affected) parts.push('affected');
  else if (opts.smoke) parts.push('smoke');
  return parts.join(' + ');
}

/** Changed files Jest can relate to tests: TypeScript and JavaScript outside scripts/. */
export function jestRelevant(path) {
  return /\.(ts|tsx|js|jsx)$/.test(path) && !path.startsWith('scripts/') && !path.startsWith('src/generated/');
}

/**
 * The Jest run for the flags: {kind: 'none'} (quick), {kind: 'all'} (full, with or without coverage),
 * {kind: 'paths', files} (area and smoke test files, run by path) or {kind: 'related', files}
 * (`--findRelatedTests`: the changed files, plus the area and smoke test files, which relate to
 * themselves). `files` is sorted and without duplicates; an empty list means there is nothing to run.
 *   areaTestFiles: the test files of opts.areas
 *   smokeFiles: the test files of the smoke folder
 *   changedFiles: files changed against the merge base and uncommitted, existing ones only
 */
export function jestPlan(opts, {areaTestFiles = [], smokeFiles = [], changedFiles = []} = {}) {
  if (opts.coverage || !partial(opts)) return {kind: opts.quick && !opts.coverage ? 'none' : 'all'};
  const files = new Set(areaTestFiles);
  // Affected always includes smoke: a change can break a flow no test imports directly.
  if (opts.smoke || opts.affected) smokeFiles.forEach(f => files.add(f));
  if (opts.affected) {
    changedFiles.filter(jestRelevant).forEach(f => files.add(f));
    return {kind: 'related', files: [...files].sort()};
  }
  return {kind: 'paths', files: [...files].sort()};
}

/** The Jest command-line arguments for a plan (without `jest` itself); null when nothing runs. */
export function jestArgs(plan, {coverageArgs = []} = {}) {
  if (plan.kind === 'none') return null;
  if (plan.kind === 'all') return [...coverageArgs];
  if (!plan.files.length) return null;
  const mode = plan.kind === 'related' ? '--findRelatedTests' : '--runTestsByPath';
  return [mode, ...plan.files, '--passWithNoTests'];
}

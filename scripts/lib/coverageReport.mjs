// Pure parts of scripts/coverage-report.mjs: read Jest's coverage summary and test results into the
// inputs of the area matrix (scripts/lib/testAreas.mjs), and the coverage ratchet. No I/O here, so
// scripts/test-coverage-report.mjs can test them. Design: docs/dev/history/technical-design-test-tiers.md §3.5.

/** How many points an area's line or branch coverage may fall below its baseline before the run fails. */
export const RATCHET_TOLERANCE = 2.0;

/** `path` relative to `root`, with `/` separators (Jest reports absolute, OS-specific paths). */
export function relativePath(path, root) {
  const norm = p => p.split('\\').join('/');
  const r = norm(root).replace(/\/$/, '');
  const p = norm(path);
  return p.startsWith(`${r}/`) ? p.slice(r.length + 1) : p;
}

/** coverage-summary.json → {relative src path: {lines, branches}}, without the "total" entry. */
export function coverageByFile(summary, root) {
  const out = {};
  for (const [path, entry] of Object.entries(summary)) {
    if (path === 'total') continue;
    out[relativePath(path, root)] = {lines: entry.lines, branches: entry.branches};
  }
  return out;
}

/** Jest's --json results → {relative test file: number of tests}. */
export function testsPerFile(results, root) {
  const out = {};
  for (const file of results.testResults ?? []) out[relativePath(file.name, root)] = (file.assertionResults ?? []).length;
  return out;
}

const round1 = n => Math.round(n * 10) / 10;

/**
 * The areas whose line or branch coverage is more than `tolerance` points below the baseline:
 * [{id, metric, now, base}]. Areas without a baseline or without measured lines are not checked.
 */
export function ratchetFailures(stats, baseline, tolerance = RATCHET_TOLERANCE) {
  const failures = [];
  for (const s of stats) {
    const base = baseline[s.id];
    if (!base) continue;
    for (const metric of ['lines', 'branches']) {
      const now = s[metric];
      if (now === null || base[metric] === undefined) continue;
      if (now < base[metric] - tolerance) failures.push({id: s.id, metric, now: round1(now), base: base[metric]});
    }
  }
  return failures;
}

/** One line per failure, naming the area and both numbers. */
export function formatFailures(failures, tolerance = RATCHET_TOLERANCE) {
  return failures.map(f => `${f.id}: ${f.metric} ${f.now.toFixed(1)} % is more than ${tolerance.toFixed(1)} points below its baseline of ${f.base.toFixed(1)} %`);
}

/**
 * The baseline raised to the current values: an area's number only goes up, never down (lowering is a
 * hand edit, explained in the commit). Areas new to the baseline get their current values; areas
 * without measured lines are left out.
 */
export function raiseBaseline(stats, baseline) {
  const next = {};
  for (const s of stats) {
    const old = baseline[s.id] ?? {};
    const entry = {};
    for (const metric of ['lines', 'branches']) {
      const now = s[metric] === null ? undefined : round1(s[metric]);
      const values = [old[metric], now].filter(v => v !== undefined);
      if (values.length) entry[metric] = Math.max(...values);
    }
    if (Object.keys(entry).length) next[s.id] = entry;
  }
  return next;
}

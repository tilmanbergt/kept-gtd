// Help coverage by scenarios (docs/dev/history/technical-design-quality-assurance.md §3.3,
// requirements S3-S5): per help page, its `##`/`###` headings and the scenarios whose `help:`
// names them. Pure, tested by scripts/test-help-coverage.mjs. A view, never a gate.

/** The `#`-`######` headings of a page outside fenced code, in order: [{level, title}]. */
function headingLines(markdown) {
  const out = [];
  let inCode = false;
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    const m = !inCode && /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (m) out.push({level: m[1].length, title: m[2].replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')});
  }
  return out;
}

/**
 * Per page ([{id, markdown}]) its title and its `##`/`###` headings
 * [{page: 'x.md', title, headings: [{page, anchor, title, level}]}], sorted by page.
 * `anchorsOf(markdown)` is domain/helpLinks.ts's pageAnchors: one slug per heading, in order.
 */
export function helpHeadings(pages, anchorsOf) {
  return [...pages].sort((a, b) => a.id.localeCompare(b.id)).map(p => {
    const lines = headingLines(p.markdown);
    const anchors = anchorsOf(p.markdown);
    const page = `${p.id}.md`;
    const top = lines.find(h => h.level === 1);
    const headings = lines
      .map((h, i) => ({page, anchor: anchors[i], title: h.title, level: h.level}))
      .filter(h => h.level === 2 || h.level === 3);
    return {page, title: top ? top.title : p.id, headings};
  });
}

/** Whether `excluded` ({'page.md' or 'page.md#anchor': reason}) leaves out a page or heading. */
const isExcluded = (excluded, key) => Object.prototype.hasOwnProperty.call(excluded, key);

/**
 * Per page, which headings scenarios name. A reference covers exactly its heading (a `##` does not
 * cover the `###` under it); a page-only reference covers the page row only. Excluded pages are
 * left out, excluded headings are dropped from their page.
 * Returns [{page, title, pageRefs: [titles], headings: [{…heading, scenarios: [titles]}], covered, total}].
 */
export function coverHeadings(pages, scenarios, excluded = {}) {
  const byRef = new Map();
  for (const s of scenarios) for (const ref of s.help ?? []) byRef.set(ref, [...(byRef.get(ref) ?? []), s.title]);
  return pages
    .filter(p => !isExcluded(excluded, p.page))
    .map(p => {
      const headings = p.headings
        .filter(h => !isExcluded(excluded, `${h.page}#${h.anchor}`))
        .map(h => ({...h, scenarios: byRef.get(`${h.page}#${h.anchor}`) ?? []}));
      const covered = headings.filter(h => h.scenarios.length).length;
      return {page: p.page, title: p.title, pageRefs: byRef.get(p.page) ?? [], headings, covered, total: headings.length};
    });
}

/** Covered and total headings per feature area, using the areas' `help` pages: {id: {covered, total}}. */
export function helpByArea(areas, coverage) {
  const byPage = new Map(coverage.map(c => [c.page, c]));
  const out = {};
  for (const a of areas) {
    const rows = (a.help ?? []).map(p => byPage.get(p)).filter(Boolean);
    out[a.id] = {covered: rows.reduce((n, r) => n + r.covered, 0), total: rows.reduce((n, r) => n + r.total, 0)};
  }
  return out;
}

/** Overall totals: {pages, headings, covered}. */
export function coverageTotals(coverage) {
  return {
    pages: coverage.length,
    headings: coverage.reduce((n, c) => n + c.total, 0),
    covered: coverage.reduce((n, c) => n + c.covered, 0),
  };
}

/**
 * The report section (§3.3; technical-design-claims-assessment.md §3): a totals line first, then the
 * pages with uncovered headings, emptiest first (lowest share covered, then most gaps), each with its
 * uncovered headings as `- page.md#anchor - Title`; the fully covered pages in one line at the end.
 */
export function renderHelpCoverage(coverage, excluded = {}) {
  const t = coverageTotals(coverage);
  const lines = [
    '## Help sections without a scenario',
    '',
    `**Help: ${t.covered} / ${t.headings} headings have a scenario** (${t.pages} pages).`,
    '',
    'A heading counts when a scenario\'s `help:` names it (`docs/dev/test-scenarios.md`); a reference covers',
    'its heading only. Excluded in `scripts/help-coverage.json`. Report only.',
    '',
  ];
  const share = c => (c.total ? c.covered / c.total : 1);
  const gaps = c => c.headings.filter(h => !h.scenarios.length);
  const open = coverage.filter(c => gaps(c).length).sort((a, b) => share(a) - share(b) || gaps(b).length - gaps(a).length || a.page.localeCompare(b.page));
  for (const c of open) {
    const pageNote = c.pageRefs.length ? ` (+ ${c.pageRefs.length} page-only)` : '';
    lines.push(`### ${c.page} - ${c.covered} / ${c.total}${pageNote}`, '');
    for (const h of gaps(c)) lines.push(`- ${h.page}#${h.anchor} - ${h.title}`);
    lines.push('');
  }
  const full = coverage.filter(c => !gaps(c).length).map(c => c.page).sort();
  if (full.length) lines.push(`Covered in full: ${full.join(', ')}.`, '');
  const excludedKeys = Object.keys(excluded);
  if (excludedKeys.length) lines.push(`Excluded: ${excludedKeys.map(k => `\`${k}\``).join(', ')}.`, '');
  return lines.join('\n') + '\n';
}

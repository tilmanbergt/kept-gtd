// Plain-node checks for scripts/lib/helpCoverage.mjs.  Run: node scripts/test-help-coverage.mjs
import assert from 'node:assert/strict';
import {coverageTotals, coverHeadings, helpByArea, helpHeadings, renderHelpCoverage} from './lib/helpCoverage.mjs';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};

const slug = s => s.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');
const anchorsOf = md => [...md.replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.*)$/gm)].map(m => slug(m[1].replace(/\*\*|`/g, '')));

const pages = [
  {id: 'review', markdown: '# Weekly Review\n\n## The steps\n\n### Inbox to zero\n\n```\n## not a heading\n```\n\n## Open loops\n'},
  {id: 'daily', markdown: '# Daily\n\n## Labels\n'},
  {id: 'index', markdown: '# Overview\n\n## Start here\n'},
  {id: 'settings', markdown: '# Settings\n\n## About\n\n## Data\n'},
];
const headings = helpHeadings(pages, anchorsOf);

t('headings: ## and ### outside code, with page title and anchor', () => {
  const review = headings.find(p => p.page === 'review.md');
  assert.equal(review.title, 'Weekly Review');
  assert.deepEqual(review.headings.map(h => `${h.level} ${h.anchor} ${h.title}`), ['2 the-steps The steps', '3 inbox-to-zero Inbox to zero', '2 open-loops Open loops']);
});

const scenarios = [
  {title: 'Zero', help: ['review.md#the-steps']},
  {title: 'Labels', help: ['daily.md']},
  {title: 'Start', help: ['index.md#start-here']},
];
const excluded = {'index.md': 'overview', 'settings.md#about': 'static text'};
const cov = coverHeadings(headings, scenarios, excluded);

t('a ## reference does not cover its ###; a page-only reference covers the page row only', () => {
  const review = cov.find(c => c.page === 'review.md');
  assert.deepEqual(review.headings.map(h => [h.anchor, h.scenarios]), [['the-steps', ['Zero']], ['inbox-to-zero', []], ['open-loops', []]]);
  assert.deepEqual([review.covered, review.total], [1, 3]);
  const daily = cov.find(c => c.page === 'daily.md');
  assert.deepEqual([daily.covered, daily.total, daily.pageRefs], [0, 1, ['Labels']]);
});

t('excluded pages and headings are skipped', () => {
  assert.ok(!cov.some(c => c.page === 'index.md'));
  assert.deepEqual(cov.find(c => c.page === 'settings.md').headings.map(h => h.anchor), ['data']);
  assert.deepEqual(coverageTotals(cov), {pages: 3, headings: 5, covered: 1});
});

t('area totals from the areas\' help pages', () => {
  const areas = [{id: 'review', help: ['review.md']}, {id: 'planning', help: ['daily.md', 'missing.md']}, {id: 'foundation', help: []}];
  assert.deepEqual(helpByArea(areas, cov), {review: {covered: 1, total: 3}, planning: {covered: 0, total: 1}, foundation: {covered: 0, total: 0}});
});

t('render: uncovered pages first, gaps listed, totals line', () => {
  const md = renderHelpCoverage(cov, excluded);
  assert.ok(md.indexOf('### daily.md - 0 / 1 (+ 1 page-only)') < md.indexOf('### review.md - 1 / 3'), 'pages without a covered heading first');
  assert.ok(md.includes('- review.md#inbox-to-zero - Inbox to zero'));
  assert.ok(!md.includes('review.md#the-steps -'), 'covered headings are not listed');
  assert.ok(md.includes('Excluded: `index.md`, `settings.md#about`.'));
  assert.ok(md.includes('**Total: 1 / 5 headings covered on 3 pages.**'));
});

console.log(`help-coverage: ${n} groups passed`);

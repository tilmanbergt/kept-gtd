// Plain-node checks for scripts/lib/scenarioCatalog.mjs.  Run: node scripts/test-scenario-catalog.mjs
import assert from 'node:assert/strict';
import {checkHelpRefs, parseScenarios, renderCatalog, splitHelp} from './lib/scenarioCatalog.mjs';

const src = [
  "scenario('Refile a todo', {feature: 'Inbox', design: 'technical-design-x.md'}, () => {",
  "  given('Inbox.txt has \\'Call Anna\\'', () => {});",
  '  when(',
  "    'I tap Refile',",
  '    async () => {},',
  '  );',
  "  then('it moved', () => {});",
  "  and('the note moved too', () => {});",
  '});',
  "scenario('Add a meeting', {feature: 'Daily'}, () => {",
  "  then('it is there', () => {});",
  '});',
].join('\n');

const parsed = parseScenarios(src, 'a.test.tsx');
assert.equal(parsed.length, 2);
assert.deepEqual(parsed[0], {
  title: 'Refile a todo',
  feature: 'Inbox',
  design: 'technical-design-x.md',
  help: [],
  file: 'a.test.tsx',
  steps: [
    {kind: 'Given', text: "Inbox.txt has 'Call Anna'"},
    {kind: 'When', text: 'I tap Refile'},
    {kind: 'Then', text: 'it moved'},
    {kind: 'And', text: 'the note moved too'},
  ],
});
assert.deepEqual(parsed[1].steps, [{kind: 'Then', text: 'it is there'}]);

const md = renderCatalog(parsed);
assert.ok(md.indexOf('## Daily') < md.indexOf('## Inbox'), 'features sorted');
assert.ok(md.includes("- **Given** Inbox.txt has 'Call Anna'"));
assert.ok(md.includes('design: `docs/dev/history/technical-design-x.md`'));
assert.ok(md.includes('2 scenarios.'));
assert.ok(renderCatalog(parsed.slice(0, 1)).includes('1 scenario.'));

const withSmoke = renderCatalog([{...parsed[0], smoke: true}, parsed[1]]);
assert.ok(withSmoke.includes('### Refile a todo (smoke)'), 'smoke scenarios are marked');
assert.ok(withSmoke.includes('### Add a meeting\n'), 'others are not');
assert.ok(withSmoke.includes('2 scenarios, 1 of them smoke'), 'the header counts the smoke scenarios');

// help references (technical-design-quality-assurance.md §3.1-3.2)
const withHelp = parseScenarios(
  "scenario('Get the Inbox to zero', {feature: 'Weekly Review', help: 'review.md#inbox-to-zero, daily.md'}, () => {\n  then('it is empty', () => {});\n});",
  'b.test.tsx',
);
assert.deepEqual(withHelp[0].help, ['review.md#inbox-to-zero', 'daily.md'], 'help is read, split at commas');
assert.deepEqual(splitHelp(undefined), []);
const helpMd = renderCatalog(withHelp);
assert.ok(helpMd.includes('Test: `b.test.tsx` · help: `review.md#inbox-to-zero`, `daily.md`'), 'the catalog line shows help');
assert.ok(!md.includes('help:'), 'no help part without references');

const pages = [
  {id: 'review', markdown: '# Review\n\n## Inbox to zero\n'},
  {id: 'daily', markdown: '# Daily\n'},
];
const anchorsOf = markdown => [...markdown.matchAll(/^#+\s+(.*)$/gm)].map(m => m[1].toLowerCase().replace(/ /g, '-'));
assert.deepEqual(checkHelpRefs(withHelp, pages, anchorsOf), [], 'existing heading and page-only reference are accepted');
const broken = (help) => checkHelpRefs([{title: 'T', file: 'c.test.tsx', help: [help]}], pages, anchorsOf);
assert.deepEqual(broken('loops.md#closing'), ['c.test.tsx: T: loops.md#closing (no such page)'], 'broken page');
assert.deepEqual(broken('review.md#inbox'), ['c.test.tsx: T: review.md#inbox (no such heading)'], 'broken anchor');
assert.deepEqual(broken('review'), ['c.test.tsx: T: review (no such page)'], 'not a page reference');
assert.deepEqual(broken('review.md'), [], 'page-only reference');
console.log('scenario-catalog: 3 groups passed');

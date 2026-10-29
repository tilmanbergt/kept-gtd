// Plain-node checks for scripts/lib/userDocs.mjs.  Run: node scripts/test-userdocs.mjs
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildUserDocs, checkLinks, pageTitle, parseIndexGroups, renderUserDocsTs} from './lib/userDocs.mjs';
import {importTs} from './lib/tsModule.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const {headingSlug, pageAnchors} = await importTs(join(ROOT, 'src', 'domain', 'helpLinks.ts'));

let n = 0;
function t(name, fn) {
  fn();
  n++;
}

t('title', () => {
  assert.equal(pageTitle('intro\n# Daily and focus mode\n## x', 'daily'), 'Daily and focus mode');
  assert.equal(pageTitle('no heading', 'daily'), 'daily');
});

t('index groups', () => {
  const index = [
    '# Help',
    '## Start here',
    '- [Getting started](getting-started.md): install',
    '- [Why](philosophy.md)',
    '## Empty',
    'text',
    '## Daily use',
    '- [Daily](daily.md#focus)',
    '- [Gone](missing.md)',
    '- [External](https://example.com)',
  ].join('\r\n');
  assert.deepEqual(parseIndexGroups(index, ['getting-started', 'philosophy', 'daily']), [
    {title: 'Start here', pageIds: ['getting-started', 'philosophy']},
    {title: 'Daily use', pageIds: ['daily']},
  ]);
});

t('build: overview, unlisted pages in More', () => {
  const docs = buildUserDocs([
    {id: 'index', markdown: '# Help\n## A\n- [One](one.md)\n'},
    {id: 'one', markdown: '# Page one\r\ntext'},
    {id: 'two', markdown: '# Page two'},
  ]);
  assert.deepEqual(docs.groups, [
    {title: 'A', pageIds: ['one']},
    {title: 'More', pageIds: ['two']},
  ]);
  assert.equal(docs.pages.index.title, 'Overview');
  assert.equal(docs.pages.one.title, 'Page one');
  assert.equal(docs.pages.one.markdown, '# Page one\ntext');
  assert.match(renderUserDocsTs(docs), /export const USER_DOCS/);
});

t('heading slugs follow GitHub', () => {
  assert.equal(headingSlug('Marking for later'), 'marking-for-later');
  assert.equal(headingSlug('Files outside Note'), 'files-outside-note');
  assert.equal(headingSlug('Opening Kept GTD from a note'), 'opening-kept-gtd-from-a-note');
  assert.equal(headingSlug('Time & place: what, why?'), 'time--place-what-why');
  assert.equal(headingSlug('Step 1 · Folders'), 'step-1--folders');
  assert.equal(headingSlug('snake_case'), 'snake_case');
});

t('link check: broken page, broken anchor, external links and code ignored', () => {
  const files = [
    {id: 'one', markdown: '# One\n## Marking for later\nSee [two](two.md), [top](two.md#getting-there), [web](https://example.com).'},
    {id: 'two', markdown: '# Two\n## Getting there\n[gone](gone.md) [bad](one.md#nope) [later](one.md#marking-for-later) `[code](x.md)`\n```\n[fenced](y.md)\n```\n[img](images/a.png)'},
  ];
  assert.deepEqual(checkLinks(files, pageAnchors), [
    'two.md: gone.md (no such page)',
    'two.md: one.md#nope (no such heading)',
    'two.md: images/a.png (not a help page)',
  ]);
});

t('real docs/user: every page listed in index.md, every link resolves', () => {
  const dir = join(ROOT, 'docs', 'user');
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({id: f.slice(0, -3), markdown: readFileSync(join(dir, f), 'utf8')}));
  const docs = buildUserDocs(files);
  assert.ok(docs.pages.index, 'index.md exists');
  assert.ok(!docs.groups.some(g => g.title === 'More'), 'a page is missing from index.md');
  assert.deepEqual(checkLinks(files, pageAnchors), []);
});

console.log(`userDocs: ${n} checks passed`);

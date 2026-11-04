// Plain-node checks for scripts/lib/helpLabels.mjs.  Run: node scripts/test-help-labels.mjs
import assert from 'node:assert/strict';
import ts from 'typescript';
import {collectAppStrings} from './lib/appStrings.mjs';
import {
  checkLabels,
  demoNamesOf,
  extractDiagramLabels,
  extractLabels,
  extractQuotes,
  labelMatches,
  labelParts,
  quoteMatches,
  renderLabels,
} from './lib/helpLabels.mjs';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};

const strings = collectAppStrings(ts, [
  {
    path: 'src/a.tsx',
    source: [
      "const s = ['Settings', 'Data', 'Profiles', 'Engage ›', 'Back', 'Save'];",
      'const m = `Moved to ${name}`;',
      'const k = `Saved to ${name} · hidden by ${context}`;',
    ].join('\n'),
  },
]);

const page = [
  '# Page',
  '',
  'Tap **Save**, then **Settings → Data → Profiles**. **Engage** opens it; **‹ Back** returns.',
  '',
  '```',
  '**Not a label** "not a quote"',
  '```',
  'In `**code**` nothing counts. The status says "Moved to Garden renovation" and "Saved to Team · hidden by Home".',
  'A **[Daily](daily.md)** link label and **Waiting for**.',
].join('\n');

t('labels: bold outside code fences and inline code, with page and line, links stripped', () => {
  const labels = extractLabels(page, 'p.md');
  assert.deepEqual(labels.map(l => `${l.line} ${l.label}`), ['3 Save', '3 Settings → Data → Profiles', '3 Engage', '3 ‹ Back', '9 Daily', '9 Waiting for']);
});

t('quotes: three characters or more, outside code', () => {
  assert.deepEqual(extractQuotes(page, 'p.md').map(q => q.label), ['Moved to Garden renovation', 'Saved to Team · hidden by Home']);
  assert.deepEqual(extractQuotes('"ab" and "abc"', 'q.md').map(q => q.label), ['abc']);
});

t('→ split, › and ‹ tolerated', () => {
  assert.deepEqual(labelParts('Settings → Data'), [['Settings'], ['Data']]);
  assert.deepEqual(labelParts('Engage ›'), [['Engage ›', 'Engage']]);
  assert.ok(labelMatches('Settings → Data → Profiles', strings));
  assert.ok(!labelMatches('Settings → Contexts', strings), 'every part must match');
  assert.ok(labelMatches('‹ Back', strings));
  assert.ok(labelMatches('Engage', strings), 'a label is found inside "Engage ›"');
  assert.ok(labelMatches('Engage ›', strings));
});

t('demo names in quotes are placeholders', () => {
  const demo = demoNamesOf([
    {path: '1 Projects/Garden renovation/project.txt', content: '- [ ] Get a quote from the landscaper #wf/marco\n- 2026-10-04 10:00-11:00 Site visit with Marco #marco'},
    {path: '2 Areas/Team/area.txt', content: ''},
    {path: '2 Areas/Home/area.txt', content: ''},
  ]);
  for (const name of ['Garden renovation', 'Team', 'Home', 'Marco', 'Get a quote from the landscaper', 'Site visit with Marco']) assert.ok(demo.has(name), name);
  assert.ok(quoteMatches('Moved to Garden renovation', strings, demo), 'pattern with a demo name');
  assert.ok(quoteMatches('Saved to Team · hidden by Home', strings, demo), 'two names');
  assert.ok(quoteMatches('Get a quote from the landscaper', strings, demo), 'a demo title alone');
  assert.ok(!quoteMatches('Copied to Garden renovation', strings, demo), 'the text around the name must be the app\'s');
  assert.ok(!quoteMatches('Something else', strings, demo));
});

t('allowlist hit, unmatched list and stale allowlist entry', () => {
  const labels = extractLabels(page, 'p.md');
  const allow = {'Waiting for': 'test', 'Long gone': 'no longer in the help'};
  const r = checkLabels(labels, strings, allow);
  assert.equal(r.checked, 6);
  assert.equal(r.allowlisted, 1);
  assert.deepEqual(r.unmatched.map(u => u.label), ['Daily']);
  assert.deepEqual(r.stale, ['Long gone']);
  const md = renderLabels(r, checkLabels([], strings));
  assert.ok(md.includes('6 checked · 4 matched · 1 allowlisted · 1 unmatched'));
  assert.ok(md.includes('- p.md:9 **Daily**'));
  assert.ok(md.includes('- Long gone'));
});

t('diagram labels: Mermaid markdown strings and HTML label elements', () => {
  const mmd = 'flowchart TD\n  A["`**Waiting for** Lena`"] --> B["plain **not a label**"]\n  C["`**Next**`"]';
  assert.deepEqual(extractDiagramLabels(mmd, 'd.mmd').map(l => `${l.line} ${l.label}`), ['2 Waiting for', '3 Next']);
  const html = '<div><b class="label">Save &amp; close</b> <b>plain</b></div>';
  assert.deepEqual(extractDiagramLabels(html, 'd.html').map(l => l.label), ['Save & close']);
});

console.log(`help-labels: ${n} groups passed`);

// Plain-node checks for scripts/lib/testNotes.mjs.  Run: node scripts/test-test-notes.mjs
import assert from 'node:assert/strict';
import {
  areasTouched,
  changelogAdded,
  diffScenarios,
  lastReleaseTag,
  parseCommitMessage,
  parseScenarios,
  renderTestNotes,
  touchedAreaNames,
} from './lib/testNotes.mjs';

let n = 0;
function t(name, fn) {
  fn();
  n++;
}

t('commit message: no block', () => {
  assert.deepEqual(parseCommitMessage('Fix paging\n\nSome details.\n'), {subject: 'Fix paging', deviceTest: null, none: false});
  assert.deepEqual(parseCommitMessage('Only a subject'), {subject: 'Only a subject', deviceTest: null, none: false});
});

t('commit message: multi-line block to the end, CRLF', () => {
  const msg = 'Show day panel\r\n\r\nBody text.\r\n\r\nDevice test:\r\n1. Open Week.\r\n   → Panel opens.\r\n2. Long-press does nothing.\r\n\r\n';
  const c = parseCommitMessage(msg);
  assert.equal(c.subject, 'Show day panel');
  assert.equal(c.deviceTest, '1. Open Week.\n   → Panel opens.\n2. Long-press does nothing.');
  assert.equal(c.none, false);
});

t('commit message: none on the same line, any case', () => {
  const c = parseCommitMessage('Docs\n\ndevice TEST: none - docs only');
  assert.equal(c.deviceTest, 'none - docs only');
  assert.equal(c.none, true);
  assert.equal(parseCommitMessage('X\n\nDevice test: Open Daily.\nCheck the badge.').deviceTest, 'Open Daily.\nCheck the badge.');
});

t('commit message: "Device test:" in the subject or mid-sentence is not a block', () => {
  assert.equal(parseCommitMessage('Device test: rename\n\nbody').deviceTest, null);
  assert.equal(parseCommitMessage('X\n\nThe Device test: below is gone.').deviceTest, null);
});

const AREAS = [
  {id: 'planning', name: 'Daily, Week and Month', help: ['planning.md'], tests: ['__tests__/**/*Week*'], sources: ['src/screens/Week*.tsx']},
  {id: 'engage', name: 'Engage', help: ['engage.md'], tests: [], sources: ['src/engage/**']},
];

t('areas touched: by files and help pages, most first, other last', () => {
  const files = ['src/screens/WeekScreen.tsx', '__tests__/WeekGrid.test.tsx', 'docs/user/engage.md', 'scripts/x.mjs', 'docs/user/planning.md', 'android/a.kt'];
  assert.deepEqual(areasTouched(files, AREAS), [
    {id: 'planning', name: 'Daily, Week and Month', count: 3},
    {id: 'engage', name: 'Engage', count: 1},
    {id: null, name: 'Other', count: 2},
  ]);
  assert.deepEqual(touchedAreaNames(areasTouched(files, AREAS)), ['Daily, Week and Month', 'Engage']);
  assert.deepEqual(areasTouched([], AREAS), []);
});

const SC_BEFORE = [
  '# Tested scenarios',
  '',
  '97 scenarios.',
  '',
  '## Week',
  '',
  '### Chip opens the day panel',
  '',
  '- **Given** a week with meetings',
  '- **When** I tap a chip',
  '- **Then** the panel opens',
  '',
  'Test: `__tests__/scenarios/week.test.tsx`',
  '',
  '### Old one',
  '',
  '- **Given** x',
  '',
  '## Engage',
  '',
  '### Engage shows next actions',
  '',
  '- **Given** y',
].join('\r\n');

t('scenarios: parse and diff', () => {
  const before = parseScenarios(SC_BEFORE);
  assert.equal(before.size, 3);
  assert.deepEqual(before.get('Chip opens the day panel'), {
    area: 'Week',
    text: '- **Given** a week with meetings\n- **When** I tap a chip\n- **Then** the panel opens',
  });
  const after = parseScenarios(
    SC_BEFORE.replace('the panel opens', 'the panel opens on that day').replace('### Old one', '### Renamed one') +
      '\r\n\r\n### Engage hides done actions\r\n\r\n- **Given** z\r\n',
  );
  const d = diffScenarios(before, after);
  assert.deepEqual(d.added.map(s => [s.title, s.area]), [['Renamed one', 'Week'], ['Engage hides done actions', 'Engage']]);
  assert.deepEqual(d.changed.map(s => s.title), ['Chip opens the day panel']);
  assert.deepEqual(d.removed.map(s => s.title), ['Old one']);
  assert.deepEqual(diffScenarios(new Map(), parseScenarios('')), {added: [], changed: [], removed: []});
});

t('changelog: only new lines of [Unreleased], under their section', () => {
  const before = '# C\n\n## [Unreleased]\n\n### New\n- A\n\n## [0.1.0] - 2026-10-01\n- old\n';
  const after = '# C\n\n## [Unreleased]\n\n### New\n- A\n- B\n\n### Fixed\n- C\n\n## [0.1.0] - 2026-10-01\n- old\n';
  assert.deepEqual(changelogAdded(before, after), [
    {section: 'New', lines: ['- B']},
    {section: 'Fixed', lines: ['- C']},
  ]);
  assert.deepEqual(changelogAdded('', '## [Unreleased]\n- X\n'), [{section: '', lines: ['- X']}]);
  assert.deepEqual(changelogAdded(after, after), []);
});

t('last release tag: semver only, beta tags ignored', () => {
  assert.equal(lastReleaseTag(['v0.9.0', 'v0.10.0', 'v0.11.0-beta.1', 'v0.10.1', 'other', '']), 'v0.10.1');
  assert.equal(lastReleaseTag(['v0.22.0-beta.2', 'x']), null);
  assert.equal(lastReleaseTag([]), null);
});

t('render: new marks, warnings, sections left out when empty', () => {
  const md = renderTestNotes({
    label: '0.22.0-alpha+a1b2c3d',
    branch: 'feature/x',
    baseDesc: 'compared with main (merge base 9f8e7d6)',
    commits: [
      {sha: 'a1b2c3d4e5', subject: 'Show day panel', deviceTest: '1. Open Week.\n   → Panel opens.', none: false},
      {sha: 'b2c3d4e5f6', subject: 'Rename helper', deviceTest: null, none: false},
    ],
    newShas: new Set(['a1b2c3d4e5']),
    areas: [{id: 'planning', name: 'Daily, Week and Month', count: 2}, {id: null, name: 'Other', count: 1}],
    scenarios: {added: [{title: 'T1', area: 'Week', text: '- **Given** g'}], changed: [], removed: [{title: 'T0', area: 'Week', text: 'x'}]},
    changelog: [],
  });
  assert.ok(md.startsWith('# Kept GTD 0.22.0-alpha+a1b2c3d - what to test\n\nBranch feature/x · compared with main (merge base 9f8e7d6) · 2 commits, 1 new in this push\n'));
  assert.ok(md.includes('### NEW · a1b2c3d Show day panel\n\n1. Open Week.\n   → Panel opens.\n'));
  assert.ok(md.includes('### b2c3d4e Rename helper   ⚠ no Device test block\n'));
  assert.ok(md.includes('Daily, Week and Month (2 files), Other (1 file) - recheck these on the device.'));
  assert.ok(md.includes('**Added:** T1 _(Week)_\n\n- **Given** g'));
  assert.ok(md.includes('**Removed:** T0 _(Week)_\n'));
  assert.ok(!md.includes('User-visible changes'));
  assert.ok(!/\n{3,}/.test(md));
  assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
});

t('render: nothing since the base', () => {
  const md = renderTestNotes({label: 'unbuilt', branch: 'main', baseDesc: 'compared with release v0.21.1', commits: [], scenarios: {added: [], changed: [], removed: []}});
  assert.equal(md, '# Kept GTD unbuilt - what to test\n\nBranch main · compared with release v0.21.1 · 0 commits\n');
});

console.log(`test-notes: ${n} groups passed`);

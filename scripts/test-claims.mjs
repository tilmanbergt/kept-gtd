// Plain-node checks for scripts/lib/claims.mjs.  Run: node scripts/test-claims.mjs
import assert from 'node:assert/strict';
import {checkClaims, numberedSections, parseClaims, renderClaims} from './lib/claims.mjs';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};

const entry = (id, {kind = 'promise', backing = 'tested', evidence = 'a.test.ts'} = {}) =>
  [`### ${id} A claim about ${id}`, `- Kind: ${kind}`, '- Stated: README', `- Backing: ${backing}`, `- Evidence: ${evidence}`, '- Re-checked: every push (CI)', ''].join('\n');
const register = (...entries) => ['# Claims register', '', '## Your files', '', ...entries].join('\n');

const files = new Set(['a.test.ts', 'b.md', 'scripts/x.mjs']);
const env = {
  exists: p => files.has(p),
  anchorsOf: p => (p === 'b.md' ? ['the-heading'] : null),
  sections: {'DEVELOPMENT-POLICY': {9: '## 9. Release\n- [ ] **PRIVACY.md** still true.\n'}, RELEASING: {6: '## 6. Device check\n'}},
};
const problems = md => checkClaims(parseClaims(md), env);

t('reads groups, ids, titles and fields', () => {
  const [c] = parseClaims(register(entry('F1')));
  assert.deepEqual([c.id, c.group, c.title, c.fields.Backing, c.line], ['F1', 'Your files', 'A claim about F1', 'tested', 5]);
});

t('a well-formed register has no problems; file, anchor and checklist steps resolve', () => {
  assert.deepEqual(problems(register(entry('F1', {evidence: 'a.test.ts; b.md#the-heading'}), entry('F2', {backing: 'reviewed', evidence: 'DEVELOPMENT-POLICY §9 "PRIVACY.md still true"; RELEASING §6'}))), []);
});

t('missing field, unknown kind and backing, duplicate and bad ids', () => {
  const missing = register(entry('F1').replace('- Stated: README\n', ''));
  assert.match(problems(missing)[0], /F1: missing "- Stated:"/);
  assert.match(problems(register(entry('F1', {kind: 'wish'})))[0], /kind "wish"/);
  assert.match(problems(register(entry('F1', {backing: 'hoped'})))[0], /backing "hoped"/);
  assert.match(problems(register(entry('F1'), entry('F1'))).join('\n'), /duplicate id \(also line 5\)/);
  assert.match(problems(register(entry('f-1')))[0], /capital letter and a number/);
});

t('evidence that does not exist', () => {
  assert.match(problems(register(entry('F1', {evidence: 'gone.test.ts'}))).join('\n'), /gone\.test\.ts does not exist/);
  assert.match(problems(register(entry('F1', {evidence: 'b.md#nope'})))[0], /b\.md has no heading #nope/);
  assert.match(problems(register(entry('F1', {backing: 'reviewed', evidence: 'DEVELOPMENT-POLICY §12'})))[0], /has no §12/);
  assert.match(problems(register(entry('F1', {backing: 'reviewed', evidence: 'DEVELOPMENT-POLICY §9 "Logging"'})))[0], /§9 has no step "Logging"/);
  assert.match(problems(register(entry('F1', {backing: 'reviewed', evidence: 'the checklist'})))[0], /neither a path nor a checklist step/);
});

t('enforced or tested without a file', () => {
  assert.match(problems(register(entry('F1', {backing: 'enforced', evidence: 'RELEASING §6'})))[0], /enforced needs at least one file/);
  assert.match(problems(register(entry('F1', {backing: 'tested', evidence: 'RELEASING §6'})))[0], /tested needs at least one file/);
  assert.deepEqual(problems(register(entry('F1', {backing: 'none', evidence: 'RELEASING §6'}))), []);
});

t('numbered sections of a living document', () => {
  const s = numberedSections('# Policy\n\n## 1. Work\nA\n## 2. Principles\nB\n## Appendix\nC\n');
  assert.deepEqual(Object.keys(s), ['1', '2']);
  assert.ok(s['2'].includes('B') && !s['2'].includes('C'));
});

t('report: counts per backing and group, the gap list', () => {
  const claims = parseClaims(register(entry('F1'), entry('F2', {backing: 'none'}), entry('F3', {backing: 'reviewed', evidence: 'RELEASING §6'})));
  const md = renderClaims(claims);
  assert.ok(md.includes('| Your files | 0 | 1 | 1 | 1 | 3 |'));
  assert.ok(md.includes('| **All** | 0 | 1 | 1 | 1 | 3 |'));
  assert.ok(md.includes('Backed only by review or not at all (2):'));
  assert.ok(md.includes('- F2 (none) A claim about F2'));
  assert.ok(!md.includes('- F1 '));
});

console.log(`claims: ${n} groups passed`);

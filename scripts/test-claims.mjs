// Plain-node checks for scripts/lib/claims.mjs.  Run: node scripts/test-claims.mjs
import assert from 'node:assert/strict';
import {checkClaims, confidenceOf, fulfilledOf, numberedSections, parseClaims, renderClaims} from './lib/claims.mjs';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};

const entry = (id, {kind = 'promise', kept = 'test', evidence = 'a.test.ts', fulfilled = '5 - true everywhere', confidence = '4', assessed = '0.26.0'} = {}) =>
  [
    `### ${id} A claim about ${id}`,
    `- Kind: ${kind}`,
    '- Stated: README',
    `- Fulfilled: ${fulfilled}`,
    `- Confidence: ${confidence}`,
    `- Assessed: ${assessed}`,
    `- Kept true by: ${kept}`,
    `- Evidence: ${evidence}`,
    '- Re-checked: every push (CI)',
    '',
  ].join('\n');
const register = (...entries) => ['# Claims register', '', '## Your files', '', ...entries].join('\n');

const files = new Set(['a.test.ts', 'b.md', 'scripts/x.mjs']);
const env = {
  exists: p => files.has(p),
  anchorsOf: p => (p === 'b.md' ? ['the-heading'] : null),
  sections: {'DEVELOPMENT-POLICY': {9: '## 9. Release\n- [ ] **PRIVACY.md** still true.\n'}, RELEASING: {6: '## 6. Device check\n'}},
};
const problems = md => checkClaims(parseClaims(md), env);

t('reads groups, ids, titles and fields, the multi-word field and the scores', () => {
  const [c] = parseClaims(register(entry('F1', {fulfilled: '4 - one exception', confidence: '3'})));
  assert.deepEqual([c.id, c.group, c.title, c.fields['Kept true by'], c.line], ['F1', 'Your files', 'A claim about F1', 'test', 5]);
  assert.deepEqual(fulfilledOf(c), {score: 4, why: 'one exception'});
  assert.equal(confidenceOf(c), 3);
});

t('a well-formed register has no problems; file, anchor and checklist steps resolve', () => {
  assert.deepEqual(problems(register(entry('F1', {evidence: 'a.test.ts; b.md#the-heading'}), entry('F2', {kept: 'checklist', evidence: 'DEVELOPMENT-POLICY §9 "PRIVACY.md still true"; RELEASING §6'}))), []);
});

t('missing field, unknown kind and kept-true-by value, duplicate and bad ids', () => {
  const missing = register(entry('F1').replace('- Stated: README\n', ''));
  assert.match(problems(missing)[0], /F1: missing "- Stated:"/);
  assert.match(problems(register(entry('F1', {kind: 'wish'})))[0], /kind "wish"/);
  assert.match(problems(register(entry('F1', {kept: 'tested'})))[0], /kept true by "tested" is not one of check, test, checklist, nothing/);
  assert.match(problems(register(entry('F1'), entry('F1'))).join('\n'), /duplicate id \(also line 5\)/);
  assert.match(problems(register(entry('f-1')))[0], /capital letter and a number/);
});

t('malformed scores: out of range, no phrase, bad version', () => {
  assert.match(problems(register(entry('F1', {fulfilled: '6 - too good'})))[0], /Fulfilled is "<1-5> - <why>"/);
  assert.match(problems(register(entry('F1', {fulfilled: '4'})))[0], /Fulfilled is "<1-5> - <why>"/);
  assert.match(problems(register(entry('F1', {confidence: '0'})))[0], /Confidence is 1-5/);
  assert.match(problems(register(entry('F1', {confidence: 'high'})))[0], /Confidence is 1-5/);
  assert.match(problems(register(entry('F1', {assessed: '0.26'})))[0], /Assessed is a version x\.y\.z/);
  assert.deepEqual(problems(register(entry('F1', {fulfilled: '1 - not true at all', confidence: '1'}))), [], 'a low score is not a problem');
});

t('evidence that does not exist', () => {
  assert.match(problems(register(entry('F1', {evidence: 'gone.test.ts'}))).join('\n'), /gone\.test\.ts does not exist/);
  assert.match(problems(register(entry('F1', {evidence: 'b.md#nope'})))[0], /b\.md has no heading #nope/);
  assert.match(problems(register(entry('F1', {kept: 'checklist', evidence: 'DEVELOPMENT-POLICY §12'})))[0], /has no §12/);
  assert.match(problems(register(entry('F1', {kept: 'checklist', evidence: 'DEVELOPMENT-POLICY §9 "Logging"'})))[0], /§9 has no step "Logging"/);
  assert.match(problems(register(entry('F1', {kept: 'checklist', evidence: 'the checklist'})))[0], /neither a path nor a checklist step/);
});

t('check or test without a file', () => {
  assert.match(problems(register(entry('F1', {kept: 'check', evidence: 'RELEASING §6'})))[0], /kept true by check needs at least one file/);
  assert.match(problems(register(entry('F1', {kept: 'test', evidence: 'RELEASING §6'})))[0], /kept true by test needs at least one file/);
  assert.deepEqual(problems(register(entry('F1', {kept: 'nothing', evidence: 'RELEASING §6'}))), []);
});

t('numbered sections of a living document', () => {
  const s = numberedSections('# Policy\n\n## 1. Work\nA\n## 2. Principles\nB\n## Appendix\nC\n');
  assert.deepEqual(Object.keys(s), ['1', '2']);
  assert.ok(s['2'].includes('B') && !s['2'].includes('C'));
});

t('report: counts per kept-true-by and group, the weak claims lowest first, the loose ones', () => {
  const claims = parseClaims(
    register(
      entry('F1'),
      entry('F2', {kept: 'nothing', fulfilled: '5 - true', confidence: '2'}),
      entry('F3', {kept: 'checklist', evidence: 'RELEASING §6', fulfilled: '2 - partly', confidence: '4'}),
      entry('F4', {fulfilled: '3 - main paths only', confidence: '3'}),
    ),
  );
  const md = renderClaims(claims);
  assert.ok(md.includes('| Your files | 0 | 2 | 1 | 1 | 4 |'));
  assert.ok(md.includes('| **All** | 0 | 2 | 1 | 1 | 4 |'));
  assert.ok(md.includes('### Not (fully) true, or unsure (3)'));
  const weak = ['F3 fulfilled 2, confidence 4', 'F4 fulfilled 3, confidence 3', 'F2 fulfilled 5, confidence 2'].map(s => md.indexOf(s));
  assert.ok(weak.every(i => i > 0) && weak[0] < weak[1] && weak[1] < weak[2], 'lowest Fulfilled first, then lowest Confidence');
  assert.ok(md.includes('- F3 fulfilled 2, confidence 4: A claim about F3 - partly'));
  assert.ok(!md.includes('- F1 fulfilled'), 'a true and sure claim is not listed');
  assert.ok(md.includes('### Kept true only by a checklist, or by nothing (2)'));
  assert.ok(md.includes('- F2 (nothing) A claim about F2'));
});

console.log(`claims: ${n} groups passed`);

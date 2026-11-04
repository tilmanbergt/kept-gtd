// Plain-node checks for scripts/lib/promises.mjs.  Run: node scripts/test-promises.mjs
import assert from 'node:assert/strict';
import {checkPromises, keepersOf, numberedSections, parsePromises, renderPromises, score, scoreWithWhy} from './lib/promises.mjs';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};

const row = (id, {ful = '5', conf = '4', kept = 'test', why = 'it is so'} = {}) => `| ${id} | Promise ${id} | ${ful} | ${conf} | ${kept} | ${why} |`;
const headline = (num, {rows = [row(`${num}.1`)], evidence = [`- ${num}.1: a.test.ts`], fields = {}, vision = '*A vision that wraps\nover two lines.*', rulesOut = '**Rules out:** telemetry.'} = {}) => {
  const f = {Fulfilled: '4 - mostly', Confidence: '3', Assessed: '0.26.0', Stated: 'README', ...fields};
  return [
    `## ${num}. Headline ${num}`,
    '',
    vision,
    '',
    ...Object.entries(f).filter(([, v]) => v !== null).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '| Id | Promise | Ful. | Conf. | Kept true by | Why |',
    '|---|---|:-:|:-:|---|---|',
    ...rows,
    '',
    rulesOut,
    '',
    'Evidence:',
    ...evidence,
    '',
  ].join('\n');
};
const register = (...parts) => ['# What Kept GTD promises', '', '## Using this to decide', '', '- Not: a field', '', ...parts].join('\n');

const files = new Set(['a.test.ts', 'b.md', 'LICENSE']);
const env = {
  exists: p => files.has(p),
  anchorsOf: p => (p === 'b.md' ? ['the-heading'] : null),
  sections: {'DEVELOPMENT-POLICY': {9: '## 9. Release\n- [ ] **PRIVACY.md** still true.\n'}, RELEASING: {6: '## 6. Device check\n'}},
};
const problems = md => checkPromises(parsePromises(md), env);

t('reads headlines, wrapped vision, fields, rows, rules out and evidence; skips other sections', () => {
  const [h] = parsePromises(register(headline(1, {rows: [row('1.1', {kept: 'test + checklist'})], evidence: ['- 1.1: a.test.ts; DEVELOPMENT-POLICY §9 "PRIVACY.md still true"']})));
  assert.deepEqual([h.n, h.title, h.vision, h.fields.Fulfilled, h.rulesOut], [1, 'Headline 1', 'A vision that wraps over two lines.', '4 - mostly', 'telemetry.']);
  assert.deepEqual(h.rows.map(r => [r.id, r.promise, r.fulfilled, r.confidence, r.keptBy, r.why, r.evidence]), [
    ['1.1', 'Promise 1.1', '5', '4', ['test', 'checklist'], 'it is so', ['a.test.ts', 'DEVELOPMENT-POLICY §9 "PRIVACY.md still true"']],
  ]);
  assert.deepEqual(scoreWithWhy('4 - mostly'), {score: 4, why: 'mostly'});
  assert.equal(score('6'), null);
  assert.deepEqual(keepersOf('check + test'), ['check', 'test']);
});

t('a well-formed register has no problems', () => {
  const md = register(
    headline(1, {rows: [row('1.1'), row('1.2', {kept: 'nothing'}), row('1.3', {kept: 'checklist'})], evidence: ['- 1.1: a.test.ts; b.md#the-heading', '- 1.2: -', '- 1.3: RELEASING §6']}),
    headline(2),
  );
  assert.deepEqual(problems(md), []);
});

t('headline problems: vision, fields, scores, version, rules out, no promises, duplicate number', () => {
  assert.match(problems(register(headline(1, {vision: ''})))[0], /missing its vision line/);
  assert.match(problems(register(headline(1, {fields: {Stated: null}})))[0], /missing "- Stated:"/);
  assert.match(problems(register(headline(1, {fields: {Fulfilled: '4'}})))[0], /Fulfilled is "<1-5> - <why>"/);
  assert.match(problems(register(headline(1, {fields: {Confidence: '9'}})))[0], /Confidence is 1-5/);
  assert.match(problems(register(headline(1, {fields: {Assessed: 'now'}})))[0], /Assessed is a version/);
  assert.match(problems(register(headline(1, {rulesOut: ''})))[0], /Rules out/);
  assert.match(problems(register(headline(1, {rows: [], evidence: []})))[0], /has no promises/);
  assert.match(problems(register(headline(1), headline(1))).join('\n'), /duplicate headline number/);
});

t('promise problems: id, scores, keepers, why, evidence line', () => {
  assert.match(problems(register(headline(1, {rows: [row('2.1')], evidence: ['- 2.1: a.test.ts']})))[0], /belongs to headline 2/);
  assert.match(problems(register(headline(1, {rows: [row('1.1'), row('1.1')]}))).join('\n'), /duplicate id/);
  assert.match(problems(register(headline(1, {rows: [row('1.1', {ful: '0'})]})))[0], /Fulfilled is 1-5/);
  assert.match(problems(register(headline(1, {rows: [row('1.1', {conf: 'high'})]})))[0], /Confidence is 1-5/);
  assert.match(problems(register(headline(1, {rows: [row('1.1', {kept: 'tested'})]})))[0], /use check, test, checklist, nothing/);
  assert.match(problems(register(headline(1, {rows: [row('1.1', {kept: 'test + nothing'})]})))[0], /"nothing" can't be combined/);
  assert.match(problems(register(headline(1, {rows: [row('1.1', {why: ''})]})))[0], /missing its why/);
  assert.match(problems(register(headline(1, {evidence: []})))[0], /no line in Evidence/);
  assert.match(problems(register(headline(1, {evidence: ['- 1.1: a.test.ts', '- 1.9: a.test.ts']}))).join('\n'), /1\.9: evidence for a promise that isn't in the table/);
  assert.deepEqual(problems(register(headline(1, {rows: [row('1.1', {ful: '1', conf: '1', kept: 'nothing'})], evidence: ['- 1.1: -']}))), [], 'a low score is not a problem');
});

t('evidence that does not exist, and keepers without the evidence they need', () => {
  const ev = (e, kept = 'test') => problems(register(headline(1, {rows: [row('1.1', {kept})], evidence: [`- 1.1: ${e}`]})));
  assert.match(ev('gone.test.ts').join('\n'), /gone\.test\.ts does not exist/);
  assert.match(ev('b.md#nope')[0], /b\.md has no heading #nope/);
  assert.match(ev('DEVELOPMENT-POLICY §12', 'checklist')[0], /has no §12/);
  assert.match(ev('DEVELOPMENT-POLICY §9 "Logging"', 'checklist')[0], /§9 has no step "Logging"/);
  assert.match(ev('the checklist', 'checklist')[0], /neither a path nor a checklist step/);
  assert.match(ev('RELEASING §6', 'check')[0], /kept true by check needs a file/);
  assert.match(ev('a.test.ts', 'test + checklist')[0], /kept true by checklist needs a checklist step/);
});

t('numbered sections of a living document', () => {
  const s = numberedSections('# Policy\n\n## 1. Work\nA\n## 2. Principles\nB\n## Appendix\nC\n');
  assert.deepEqual(Object.keys(s), ['1', '2']);
  assert.ok(s['2'].includes('B') && !s['2'].includes('C'));
});

t('report: headlines with ratings, weak promises lowest first, loose ones', () => {
  const md = renderPromises(
    parsePromises(
      register(
        headline(1, {
          rows: [row('1.1'), row('1.2', {ful: '2', conf: '4', kept: 'checklist'}), row('1.3', {ful: '5', conf: '2', kept: 'nothing'}), row('1.4', {ful: '3', conf: '3'})],
          evidence: ['- 1.1: a.test.ts', '- 1.2: RELEASING §6', '- 1.3: -', '- 1.4: a.test.ts'],
        }),
      ),
    ),
  );
  assert.ok(md.includes('| 1. Headline 1 | 4 | 3 | 4 |'));
  assert.ok(md.includes('### Not (fully) kept, or unsure (3)'));
  const order = ['1.2 fulfilled 2, confidence 4', '1.4 fulfilled 3, confidence 3', '1.3 fulfilled 5, confidence 2'].map(s => md.indexOf(s));
  assert.ok(order.every(i => i > 0) && order[0] < order[1] && order[1] < order[2], 'lowest Fulfilled first, then lowest Confidence');
  assert.ok(md.includes('- 1.2 fulfilled 2, confidence 4: Promise 1.2 - it is so'));
  assert.ok(!md.includes('- 1.1 fulfilled'));
  assert.ok(md.includes('### Kept true only by a checklist, or by nothing (2)'));
  assert.ok(md.includes('- 1.3 (nothing) Promise 1.3'));
});

console.log(`promises: ${n} groups passed`);

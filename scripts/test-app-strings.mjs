// Plain-node checks for scripts/lib/appStrings.mjs.  Run: node scripts/test-app-strings.mjs
import assert from 'node:assert/strict';
import ts from 'typescript';
import {collectAppStrings, isAppText, isAppTextPart, makePattern, normalize} from './lib/appStrings.mjs';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};

const strings = collectAppStrings(ts, [
  {
    path: 'src/ui/A.tsx',
    source: [
      "// 'In a comment' is not collected",
      "const a = 'Save';",
      'const b = `Moved to ${name}`;',
      'const c = `Plain template`;',
      'export const V = () => <Text>  Nothing   left\n in  </Text>;',
      'export const W = () => <Text>{count} mark{count === 1 ? "" : "s"} to process</Text>;',
    ].join('\n'),
  },
  {path: 'src/domain/b.ts', source: 'export const x = {label: "Run Integrity Check"};'},
]);

t('literals: strings, templates without gaps and JSX text, whitespace collapsed; no comments', () => {
  for (const lit of ['Save', 'Plain template', 'Nothing left in', 'Run Integrity Check']) assert.ok(strings.literals.has(lit), lit);
  assert.ok(![...strings.literals].some(l => l.includes('In a comment')));
  assert.equal(normalize('  a \n  b '), 'a b');
});

t('patterns: template expressions and JSX text with expressions', () => {
  assert.ok(strings.patterns.some(p => p.text === 'Moved to ⟨…⟩'));
  assert.ok(isAppText('Moved to Garden renovation', strings), 'a pattern matches in full');
  assert.ok(isAppText('3 marks to process', strings), 'JSX text with expressions is a pattern');
  assert.ok(!isAppText('Moved', strings), 'a pattern does not match a part');
  assert.ok(isAppTextPart('Moved to', strings), 'but its static text is part of an app text');
  assert.ok(makePattern(['', ' done']).re.test('3 done'));
});

t('substring of a literal matches, other text does not', () => {
  assert.ok(isAppText('Integrity Check', strings));
  assert.ok(!isAppText('Waiting for', strings));
  assert.ok(!isAppText('   ', strings));
});

console.log(`app-strings: ${n} groups passed`);

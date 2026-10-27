// Plain-node checks for scripts/lib/ciBuild.mjs.  Run: node scripts/test-ci-build.mjs
import assert from 'node:assert/strict';
import {betaNotes, checkBuild, nextBeta} from './lib/ciBuild.mjs';

let n = 0;
function t(name, fn) {
  fn();
  n++;
}

t('next beta: first, after others, gaps, other versions', () => {
  assert.deepEqual(nextBeta('0.22.0', []), {
    number: 1,
    tag: 'v0.22.0-beta.1',
    name: '0.22.0-beta.1',
    title: 'Kept GTD 0.22.0 beta 1',
  });
  assert.equal(nextBeta('0.22.0', ['v0.21.0', 'v0.22.0-beta.1', 'v0.22.0-beta.2']).number, 3);
  assert.equal(nextBeta('0.22.0', ['v0.22.0-beta.1', 'v0.22.0-beta.4']).number, 5);
  assert.equal(nextBeta('0.22.0', ['v0.21.0-beta.7', 'v0.22.10-beta.3', 'v0.22.0-beta.2x']).number, 1);
  assert.equal(nextBeta('0.22.0', ['v0.22.0-beta.9', 'v0.22.0-beta.10']).number, 11);
  assert.equal(nextBeta('0.22.0', ['v0.22.0-beta.1\r']).number, 2);
});

t('next beta needs a version being worked on', () => {
  assert.throws(() => nextBeta(null, []), /next-version/);
  assert.throws(() => nextBeta('0.22', []), /next-version/);
});

const GOOD = {
  info: {label: '0.22.0-alpha+abc1234', stage: 'alpha', nextVersion: '0.22.0', dirty: false, release: false},
  config: {nativeCodePackage: '/app.npk'},
  has: {labelledSnplg: true, nativePackage: true},
};

t('check build: a good alpha build', () => {
  assert.deepEqual(checkBuild(GOOD), {errors: [], warnings: []});
});

t('check build: missing pieces are errors', () => {
  assert.match(checkBuild({...GOOD, info: null}).errors[0], /build-info/);
  assert.match(checkBuild({...GOOD, has: {...GOOD.has, labelledSnplg: false}}).errors[0], /kept-gtd-0\.22\.0-alpha\+abc1234\.snplg/);
  assert.match(checkBuild({...GOOD, has: {...GOOD.has, nativePackage: false}}).errors[0], /Gradle/);
  assert.match(checkBuild({...GOOD, config: {}}).errors[0], /Gradle/);
  assert.match(checkBuild({...GOOD, config: null}).errors[0], /Gradle/);
});

t('check build: dirty is a warning for alpha, an error for beta', () => {
  const dirty = {...GOOD, info: {...GOOD.info, dirty: true, label: '0.22.0-alpha+abc1234.dirty'}};
  const alpha = checkBuild(dirty);
  assert.equal(alpha.errors.length, 0);
  assert.equal(alpha.warnings.length, 1);
  const beta = checkBuild({...dirty, info: {...dirty.info, stage: 'beta'}, beta: true});
  assert.equal(beta.errors.length, 1);
});

t('check build: a beta must be a beta towards the next version', () => {
  const beta = {...GOOD, info: {...GOOD.info, stage: 'beta', label: '0.22.0-beta+abc1234'}, beta: true};
  assert.deepEqual(checkBuild(beta).errors, []);
  assert.equal(checkBuild({...beta, info: {...beta.info, stage: 'alpha'}}).errors.length, 1);
  assert.equal(checkBuild({...beta, info: {...beta.info, stage: null, nextVersion: null}}).errors.length, 1);
  assert.equal(checkBuild({...beta, info: {...beta.info, release: true}}).errors.length, 1);
});

const CL = '# Changelog\r\n\r\n## [Unreleased]\r\n\r\n### New\r\n- thing\r\n\r\n## [0.21.0] - 2026-10-20\r\n- old\r\n';

t('beta notes: tester note, then [Unreleased]', () => {
  const notes = betaNotes(CL, {target: '0.22.0', number: 2, commit: 'abc1234'});
  assert.ok(notes.startsWith('**Beta 2 of Kept GTD 0.22.0** for testing, built from abc1234.'));
  assert.ok(notes.includes('\n\n### New\n- thing\n'));
  assert.ok(!notes.includes('old'));
});

t('beta notes: empty [Unreleased] is refused', () => {
  const empty = '## [Unreleased]\n\n## [0.21.0] - 2026-10-20\n- old\n';
  assert.throws(() => betaNotes(empty, {target: '0.22.0', number: 1, commit: 'x'}), /empty/);
});

console.log(`ci-build: ${n} groups passed`);

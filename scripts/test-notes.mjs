#!/usr/bin/env node
// TESTING.md for a build: what it contains and how to test it on the device
// (.github/workflows/check.yml job "build", .github/workflows/beta.yml, or by hand).
// Design: docs/dev/history/technical-design-build-test-notes.md
//
//   node scripts/test-notes.mjs --out build/outputs/TESTING.md [--branch <name>] [--before <sha>] [--label <label>]
//
// Base: on main the last release tag (vX.Y.Z), on any other branch the merge base with origin/main.
// --before (GitHub's github.event.before) marks the commits of the newest push as NEW.
// In GitHub Actions the notes also go to the job summary, and the step output "areas" lists the
// touched feature areas, separated by "; " (area names can contain commas). Never fails: on an error it writes a short TESTING.md saying why.

import {execFileSync} from 'node:child_process';
import {appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const FALLBACK_COMMITS = 20;

function git(args) {
  return execFileSync('git', args, {cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024});
}
function gitOrNull(args) {
  try {
    return git(args).trim();
  } catch {
    return null;
  }
}
function fileAt(rev, path) {
  return rev === EMPTY_TREE ? '' : gitOrNull(['show', `${rev}:${path}`]) ?? '';
}
function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')) : null;
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) throw new Error(`unexpected argument ${argv[i]}`);
    out[argv[i].slice(2)] = argv[i + 1] ?? '';
  }
  return out;
}

/** {base (a commit or the empty tree), baseDesc}. */
function findBase(branch) {
  if (branch === 'main') {
    const tag = lastReleaseTag((gitOrNull(['tag', '--merged', 'HEAD']) ?? '').split('\n'));
    if (tag) return {base: gitOrNull(['rev-list', '-n', '1', tag]), baseDesc: `compared with release ${tag}`};
  } else {
    const mb = gitOrNull(['merge-base', 'origin/main', 'HEAD']) ?? gitOrNull(['merge-base', 'main', 'HEAD']);
    if (mb) return {base: mb, baseDesc: `compared with main (merge base ${mb.slice(0, 7)})`};
  }
  const recent = (gitOrNull(['rev-list', `--max-count=${FALLBACK_COMMITS + 1}`, 'HEAD']) ?? '').split('\n').filter(Boolean);
  const base = recent.length > FALLBACK_COMMITS ? recent[FALLBACK_COMMITS] : EMPTY_TREE;
  return {base, baseDesc: `no base found - the last ${FALLBACK_COMMITS} commits at most`};
}

function commitsSince(base) {
  const range = base === EMPTY_TREE ? ['HEAD'] : [`${base}..HEAD`];
  const raw = git(['log', '--no-merges', '--format=%H%x1f%B%x1e', ...range]);
  return raw
    .split('\x1e')
    .map(r => r.replace(/^\s+/, ''))
    .filter(Boolean)
    .map(r => {
      const [sha, message = ''] = r.split('\x1f');
      return {sha: sha.trim(), ...parseCommitMessage(message)};
    });
}

function newInPush(before, commits) {
  if (!before) return new Set();
  if (/^0+$/.test(before)) return new Set(commits.map(c => c.sha)); // a new branch: all of it is new
  if (gitOrNull(['cat-file', '-e', `${before}^{commit}`]) === null) return new Set();
  return new Set((gitOrNull(['rev-list', `${before}..HEAD`]) ?? '').split('\n').filter(Boolean));
}

function build(opts) {
  const branch = opts.branch || gitOrNull(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';
  const label = opts.label || readJson(join(ROOT, 'build', 'build-info.json'))?.label || 'unbuilt';
  const {base, baseDesc} = findBase(branch);
  const commits = commitsSince(base);
  const files = (gitOrNull(['diff', '--name-only', base, 'HEAD']) ?? '').split('\n').filter(Boolean);
  const areas = areasTouched(files, readJson(join(ROOT, 'scripts', 'test-areas.json')).areas);
  const scenarioFile = 'docs/dev/test-scenarios.md';
  const scenarios = diffScenarios(parseScenarios(fileAt(base, scenarioFile)), parseScenarios(fileAt('HEAD', scenarioFile)));
  const changelog = changelogAdded(fileAt(base, 'CHANGELOG.md'), fileAt('HEAD', 'CHANGELOG.md'));
  const markdown = renderTestNotes({
    label,
    branch,
    baseDesc,
    commits,
    newShas: newInPush(opts.before, commits),
    areas,
    scenarios,
    changelog,
  });
  return {markdown, areaNames: touchedAreaNames(areas)};
}

const opts = (() => {
  try {
    return args(process.argv.slice(2));
  } catch (e) {
    console.error(`test-notes: ${e.message}`);
    process.exit(2);
  }
})();
const out = resolve(opts.out || join(ROOT, 'build', 'TESTING.md'));

let result;
try {
  result = build(opts);
} catch (e) {
  result = {markdown: `# What to test\n\nThe test notes could not be made: ${e.message}\n`, areaNames: []};
  console.log(`::warning::test-notes: ${e.message}`);
}
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, result.markdown, 'utf8');
console.log(`Test notes written to ${out}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + result.markdown, 'utf8');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `areas=${result.areaNames.join('; ')}\n`, 'utf8');

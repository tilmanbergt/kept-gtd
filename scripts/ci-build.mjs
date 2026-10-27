#!/usr/bin/env node
// Steps of the GitHub Actions builds that need more than one line of shell
// (.github/workflows/check.yml job "build", .github/workflows/beta.yml).
// Design: docs/dev/history/technical-design-ci-builds.md
//
//   node scripts/ci-build.mjs next-beta               prints the next beta (0.22.0-beta.1); exit 1 without a nextVersion
//   node scripts/ci-build.mjs verify [--beta]         exit 1 when the finished buildPlugin.ps1 run is not usable
//   node scripts/ci-build.mjs notes <commit> <outfile> ["<area>; <area>"]
//                                                     the beta's release text (tester note, areas to look at,
//                                                     CHANGELOG [Unreleased]); the areas come from scripts/test-notes.mjs
//
// In GitHub Actions the results also go to $GITHUB_OUTPUT (step outputs) and $GITHUB_STEP_SUMMARY.

import {execFileSync} from 'node:child_process';
import {appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {betaNotes, checkBuild, nextBeta} from './lib/ciBuild.mjs';
import {targetVersion} from './lib/versioning.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(path) {
  // PowerShell 5.1's Set-Content -Encoding UTF8 writes a BOM.
  return readFileSync(path, 'utf8').replace(/^﻿/, '');
}

function readJson(path) {
  return existsSync(path) ? JSON.parse(read(path)) : null;
}

/** Step outputs and job summary - only inside GitHub Actions. */
function output(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${v}\n`).join(''), 'utf8');
}
function summary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n', 'utf8');
}

function target() {
  const pkg = readJson(join(ROOT, 'package.json'));
  return targetVersion(pkg.version, pkg.nextVersion);
}

function cmdNextBeta() {
  const tags = execFileSync('git', ['tag', '-l'], {cwd: ROOT, encoding: 'utf8'}).split('\n').filter(Boolean);
  const t = target();
  const beta = nextBeta(t, tags);
  console.log(beta.name);
  output({tag: beta.tag, name: beta.name, title: beta.title, number: beta.number, target: t});
}

function cmdVerify(beta) {
  const info = readJson(join(ROOT, 'build', 'build-info.json'));
  const config = readJson(join(ROOT, 'build', 'generated', 'PluginConfig.json'));
  const snplg = info ? `build/outputs/kept-gtd-${info.label}.snplg` : '';
  const has = {
    labelledSnplg: !!info && existsSync(join(ROOT, snplg)),
    nativePackage: existsSync(join(ROOT, 'build', 'generated', 'app.npk')),
  };
  const {errors, warnings} = checkBuild({info, config, has, beta});
  warnings.forEach(w => console.log(`::warning::${w}`));
  if (errors.length) {
    errors.forEach(e => console.log(`::error::${e}`));
    summary(`**Build not usable:**\n\n${errors.map(e => `- ${e}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`Kept GTD ${info.label}  build ${info.versionCode}  ->  ${snplg}`);
  output({label: info.label, snplg});
  summary(
    beta
      ? `**Kept GTD ${info.label}** (build ${info.versionCode}) - published on the Releases page as a pre-release.`
      : `**Kept GTD ${info.label}** (build ${info.versionCode}) - download it under *Artifacts* below, unzip, install the \`.snplg\` over the current plugin.`,
  );
}

function cmdNotes(commit, outfile, areaList = '') {
  if (!commit || !outfile) throw new Error('notes needs <commit> <outfile>');
  const t = target();
  const tags = execFileSync('git', ['tag', '-l'], {cwd: ROOT, encoding: 'utf8'}).split('\n').filter(Boolean);
  const {number} = nextBeta(t, tags);
  const notes = betaNotes(read(join(ROOT, 'CHANGELOG.md')), {
    target: t,
    number,
    commit: commit.slice(0, 7),
    areas: areaList.split(';').map(a => a.trim()).filter(Boolean),
  });
  mkdirSync(dirname(resolve(outfile)), {recursive: true});
  writeFileSync(resolve(outfile), notes, 'utf8');
}

try {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'next-beta') cmdNextBeta();
  else if (cmd === 'verify') cmdVerify(a === '--beta');
  else if (cmd === 'notes') cmdNotes(a, b, c);
  else throw new Error(`unknown command "${cmd ?? ''}" (next-beta, verify, notes)`);
} catch (e) {
  console.log(`::error::ci-build: ${e.message}`);
  process.exit(1);
}
